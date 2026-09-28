// One owner for each remote job and local synthesis request. UI renders never own work.
export function createDiscoveryRunner({start, poll, synthesize, normalize, context, save, notify, schedule=setTimeout, cancel=clearTimeout}) {
  const active=new Map(), timers=new Map();
  const changed=p=>{save();notify(p);};
  const stateOf=p=>p.discovery;
  const isCurrent=(p,s)=>stateOf(p)===s;
  async function organize(p) {
    const s=stateOf(p), key=`synthesis:${p.id}`;
    if(active.has(key)||!s.research?.report)return;
    active.set(key,true);s.synthesisStatus='running';s.synthesisError='';changed(p);
    try {
      const result=await synthesize(p,context(p,s),s.research.report);
      if(!isCurrent(p,s))return;
      s.synthesis=normalize(result,p,s,s.research);s.synthesisStatus='completed';s.stage='synthesis';s.selectedSection='overview';
    }catch(error){if(isCurrent(p,s)){s.synthesisStatus='failed';s.synthesisError=error.message||'Could not organize the saved research. Try again.';}}
    finally{active.delete(key);if(isCurrent(p,s))changed(p);}
  }
  async function check(p) {
    const s=stateOf(p),id=s.research?.interactionId,key=`poll:${p.id}`;
    if(!id||active.has(key)||s.researchStatus!=='running')return;
    if(timers.has(p.id)){cancel(timers.get(p.id));timers.delete(p.id);}
    active.set(key,true);
    try {
      const result=await poll(id);
      if(!isCurrent(p,s)||s.research.interactionId!==id)return;
      s.research.status=result.status;s.research.error='';s.research.checkedAt=new Date().toISOString();
      if(result.status==='completed'){
        if(!result.text?.trim())throw new Error('The completed research returned no report. Check the saved job again.');
        s.research.report=result.text;s.researchStatus='completed';s.research.completedAt=new Date().toISOString();
        s.research.sources=result.sources||[];s.research.searchSuggestions=result.searchSuggestions||'';
        changed(p);await organize(p);
      }else if(['failed','cancelled'].includes(result.status)){
        s.researchStatus='failed';s.research.error='This research job could not finish. Your answers are saved; you can start a new research job.';changed(p);
      }else{
        save();timers.set(p.id,schedule(()=>{timers.delete(p.id);void check(p);},7000));
      }
    }catch(error){
      if(isCurrent(p,s)){s.researchStatus='paused';s.research.error=error.message||'Connection interrupted. Reconnect to the same research job.';changed(p);}
    }finally{active.delete(key);}
  }
  async function begin(p) {
    const s=stateOf(p),key=`start:${p.id}`;
    if(active.has(key))return;
    s.stage='research';
    if(s.research?.report){changed(p);return organize(p);}
    if(s.research?.interactionId&&!['failed','cancelled'].includes(s.research.status)){
      s.researchStatus='running';s.research.error='';changed(p);return check(p);
    }
    active.set(key,true);s.researchStatus='running';s.research={startedAt:new Date().toISOString(),status:'starting'};changed(p);
    try {
      const result=await start(p,s);
      if(!isCurrent(p,s))return;
      s.research.interactionId=result.id;s.research.status=result.status||'in_progress';
      if(result.status==='completed'&&result.text?.trim()){
        s.research.report=result.text;s.research.sources=result.sources||[];s.research.searchSuggestions=result.searchSuggestions||'';
        s.researchStatus='completed';s.research.completedAt=new Date().toISOString();changed(p);return await organize(p);
      }
      changed(p);
      await check(p);
    }catch(error){if(isCurrent(p,s)){s.researchStatus='failed';s.research.status='failed';s.research.error=error.message;changed(p);}}
    finally{active.delete(key);}
  }
  function resume(p){if(stateOf(p)?.researchStatus==='running'&&!timers.has(p.id))void check(p);}
  return {begin,organize,resume,dispose(){for(const timer of timers.values())cancel(timer);timers.clear();}};
}
