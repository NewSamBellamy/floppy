import {createClient} from 'npm:@supabase/supabase-js@2.112.3';

// Authenticated gateway: the browser sends a key only once during setup. All
// later generation uses ciphertext in Postgres, decrypted only in this function.
const url=Deno.env.get('SUPABASE_URL')||'';
const publicKey=Deno.env.get('SUPABASE_ANON_KEY')||JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
const allowedOrigins=(Deno.env.get('FLOPPY_ALLOWED_ORIGINS')||'').split(',').map(value=>value.trim()).filter(Boolean);
const textEncoder=new TextEncoder();
const textDecoder=new TextDecoder();
const models=new Set(['gemini-3.8-flash','gemini-3.1-flash-image']);
function base64(bytes:Uint8Array){return btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join(''));}
function unbase64(value:string){return Uint8Array.from(atob(value),character=>character.charCodeAt(0));}
async function wrappingKey(){
 const raw=unbase64(Deno.env.get('FLOPPY_KEY_ENCRYPTION_SECRET')||'');
 if(raw.byteLength!==32)throw new Error('Gemini vault is not configured.');
 return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
}
async function seal(value:string){const nonce=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},await wrappingKey(),textEncoder.encode(value));return {ciphertext:base64(new Uint8Array(encrypted)),nonce:base64(nonce)};}
async function unseal(ciphertext:string,nonce:string){return textDecoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(nonce)},await wrappingKey(),unbase64(ciphertext)));}
function headers(origin:string){return {'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};}
function reply(body:object,status:number,origin:string){return new Response(JSON.stringify(body),{status,headers:headers(origin)});}
async function google(key:string,path:string,body?:unknown){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
 try{return await fetch('https://generativelanguage.googleapis.com/v1beta/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:body?JSON.stringify(body):undefined,signal:controller.signal,redirect:'error'});}
 finally{clearTimeout(timer);}
}
Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'';
 if(!allowedOrigins.includes(origin))return new Response(null,{status:403});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
 if(request.method!=='POST')return reply({error:'Method not allowed.'},405,origin);
 try{
  if(!url||!publicKey||!serviceKey)throw new Error('Gemini vault is not configured.');
  const authorization=request.headers.get('authorization')||'';
  if(!/^Bearer\s+\S+$/.test(authorization))return reply({error:'Sign in to use Gemini.'},401,origin);
  const token=authorization.replace(/^Bearer\s+/,'');
  const userClient=createClient(url,publicKey,{global:{headers:{Authorization:authorization}}});
  const {data:{user},error:authError}=await userClient.auth.getUser(token);
  if(authError||!user)return reply({error:'Sign in to use Gemini.'},401,origin);
  const admin=createClient(url,serviceKey);
  const input=await request.json();
  if(!input||typeof input.action!=='string')return reply({error:'Invalid request.'},400,origin);
  if(input.action==='status'){
   const {data,error}=await admin.from('floppy_gemini_keys').select('last_four').eq('owner_id',user.id).maybeSingle();
   if(error)throw error;
   return reply({hasKey:!!data,lastFour:data?.last_four||''},200,origin);
  }
  if(input.action==='remove'){
   const {error}=await admin.from('floppy_gemini_keys').delete().eq('owner_id',user.id);if(error)throw error;
   return reply({removed:true},200,origin);
  }
  if(input.action==='save'){
   const candidate=typeof input.key==='string'?input.key.trim():'';
   if(!/^[A-Za-z0-9_-]{16,256}$/.test(candidate))return reply({error:'Enter a valid Gemini API key.'},400,origin);
   const check=await google(candidate,'models?pageSize=1');
   if(!check.ok)return reply({error:'Google did not accept this key. Check its access and try again.'},400,origin);
   const secured=await seal(candidate);
   const {error}=await admin.from('floppy_gemini_keys').upsert({owner_id:user.id,...secured,last_four:candidate.slice(-4),updated_at:new Date().toISOString()});
   if(error)throw error;
   return reply({hasKey:true,lastFour:candidate.slice(-4)},200,origin);
  }
  const {data:stored,error:readError}=await admin.from('floppy_gemini_keys').select('ciphertext,nonce').eq('owner_id',user.id).maybeSingle();
  if(readError)throw readError;
  if(!stored)return reply({error:'Connect Gemini in Settings first.'},409,origin);
  const key=await unseal(stored.ciphertext,stored.nonce);
  if(input.action==='test'){
   const check=await google(key,'models?pageSize=1');
   return check.ok?reply({connected:true},200,origin):reply({error:'Google did not accept the saved key. Replace it in Settings.'},400,origin);
  }
  if(input.action==='generate'){
   if(!models.has(input.model)||input.version!=='v1beta'||!input.body||typeof input.body!=='object')return reply({error:'Invalid generation request.'},400,origin);
   const generated=await google(key,`models/${input.model}:generateContent`,input.body);
   if(!generated.ok)return reply({error:generated.status===429?'Google quota reached. Try again later.':generated.status>=500?'Google is temporarily unavailable. Try again later.':'Google could not complete this request.',status:generated.status},generated.status===429?429:502,origin);
   return reply(await generated.json(),200,origin);
  }
  return reply({error:'Unknown action.'},400,origin);
 }catch{return reply({error:'The Gemini connection is unavailable. Try again shortly.'},503,origin);}
});
