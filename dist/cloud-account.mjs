import {CLOUD_URL,CLOUD_PUBLISHABLE_KEY} from './cloud-config.mjs';

export const cloudConfigured=Boolean(CLOUD_URL&&CLOUD_PUBLISHABLE_KEY);
const LIBRARY_URL='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3';

export async function signInWithGoogle(client,redirectTo){
 const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
 if(error)throw new Error('Could not start Google sign-in. Check that Google is enabled in Supabase Auth.');
}

export async function createCloudClient(){
 if(!cloudConfigured)return null;
 if(!window.supabase?.createClient){
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=LIBRARY_URL;script.crossOrigin='anonymous';script.onload=resolve;script.onerror=()=>reject(new Error('Could not load account services. Check your connection.'));document.head.append(script);});
 }
 if(!window.supabase?.createClient)throw new Error('Account services did not start.');
 return window.supabase.createClient(CLOUD_URL,CLOUD_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
}

export function validCollection(snapshot){
 return snapshot?.version===4&&Array.isArray(snapshot.projects)&&typeof snapshot.active==='string'&&snapshot.projects.every(project=>project&&typeof project.id==='string'&&typeof project.name==='string'&&typeof project.projectArt?.sourceUrl==='string');
}

// One account-owned snapshot preserves the existing Floppy data format and its
// source/interpretation/confirmation layers. Optimistic revision checks prevent
// another tab or device from silently replacing newer work.
export class CloudCollection{
 constructor(client,userId,onStatus=()=>{},storage=typeof localStorage==='undefined'?null:localStorage){this.client=client;this.userId=userId;this.onStatus=onStatus;this.storage=storage;this.cacheKey=`floppy-cloud-pending-v1:${userId}`;this.revision=0;this.pending=null;this.saving=false;this.conflicted=false;this.failed=false;this.timer=null;}
 async load(){
  const {data,error}=await this.client.from('floppy_collections').select('snapshot,revision').eq('owner_id',this.userId).maybeSingle();
  if(error)throw new Error('Could not load your projects. Your on-device projects are untouched.');
  if(!data){this.revision=0;return {version:4,projects:[],active:''};}
  if(!validCollection(data.snapshot))throw new Error('Cloud project data is invalid. Nothing was overwritten.');
  this.revision=Number(data.revision);
  return data.snapshot;
 }
 queue(snapshot){
  if(!validCollection(snapshot))throw new Error('Project data is incomplete and was not sent.');
  if(this.conflicted)throw new Error('Another device changed these projects. Reload before saving again.');
  const next=structuredClone(snapshot);
  try{this.storage?.setItem(this.cacheKey,JSON.stringify({expectedRevision:this.revision,snapshot:next}));}catch{throw new Error('On-device backup is full. Your change was not queued; free storage and try again.');}
  this.pending=next;this.failed=false;
  this.onStatus('saving');
  clearTimeout(this.timer);this.timer=setTimeout(()=>void this.flush(),550);
 }
 async flush(){
  clearTimeout(this.timer);this.timer=null;
  if(this.saving||!this.pending||this.conflicted)return;
  this.saving=true;const snapshot=this.pending;this.pending=null;
  try{
   const {data,error}=await this.client.rpc('save_floppy_collection',{expected_revision:this.revision,next_snapshot:snapshot});
   if(error){if(error.code==='40001'||/conflict/i.test(error.message||'')){this.conflicted=true;throw new Error('Another device changed these projects. Reload to review its changes before saving.');}throw new Error('Cloud save failed. Keep this tab open and try again.');}
   const next=Number(data);if(!Number.isSafeInteger(next)||next<=this.revision)throw new Error('Cloud save could not be confirmed. Keep this tab open.');
   this.revision=next;
   try{if(this.pending)this.storage?.setItem(this.cacheKey,JSON.stringify({expectedRevision:this.revision,snapshot:this.pending}));else this.storage?.removeItem(this.cacheKey);}catch{}
   this.onStatus(this.pending?'saving':'saved');
  }catch(error){this.pending=this.pending||snapshot;this.failed=true;this.onStatus('error',error.message);}
  finally{this.saving=false;if(this.pending&&!this.conflicted&&!this.failed)this.timer=setTimeout(()=>void this.flush(),550);}
 }
 retry(){if(this.conflicted)return;this.failed=false;return this.flush();}
 stop(){clearTimeout(this.timer);this.pending=null;}
 recoverable(){try{const saved=JSON.parse(this.storage?.getItem(this.cacheKey)||'null');return validCollection(saved?.snapshot)?saved:null;}catch{return null;}}
}

export async function invokeVault(client,action,body={}){
 const {data,error}=await client.functions.invoke('gemini-vault',{body:{action,...body}});
 if(error)throw new Error('The saved Gemini connection is unavailable. Try again shortly.');
 if(!data||data.error)throw new Error(data?.error||'Gemini could not complete this request.');
 return data;
}
