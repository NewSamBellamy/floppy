import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscoveryRunner} from './discovery-runner.mjs';
import {createDiscoveryState} from './discovery-studio.mjs';

function setup(overrides={}){
 const p={id:'one',discovery:createDiscoveryState()},calls={start:0,poll:0,synthesis:0},scheduled=[];
 const runner=createDiscoveryRunner({
  start:async()=>{calls.start++;return {id:'job-one',status:'in_progress'};},
  poll:async()=>{calls.poll++;return {status:'completed',text:'Full cited report'};},
  synthesize:async()=>{calls.synthesis++;return {northStar:'Useful outcome'};},
  normalize:value=>value,context:()=>'',save:()=>{},notify:()=>{},schedule:fn=>{scheduled.push(fn);return scheduled.length;},cancel:()=>{},...overrides,
 });
 return {p,calls,runner,scheduled};
}

test('completion retains full report and organizes exactly once',async()=>{
 const {p,calls,runner}=setup();await runner.begin(p);
 assert.equal(p.discovery.stage,'synthesis');
 assert.equal(p.discovery.research.report,'Full cited report');
 assert.deepEqual(calls,{start:1,poll:1,synthesis:1});
});

test('focused research completion goes directly to synthesis without polling',async()=>{
 const {p,calls,runner}=setup({start:async()=>({status:'completed',text:'Focused report',sources:[{url:'https://example.org'}]})});
 await runner.begin(p);assert.equal(calls.poll,0);assert.equal(calls.synthesis,1);
 assert.equal(p.discovery.research.report,'Focused report');assert.equal(p.discovery.stage,'synthesis');
});

test('synthesis retry uses saved research and never starts another remote job',async()=>{
 let attempts=0;
 const {p,calls,runner}=setup({synthesize:async()=>{if(++attempts===1)throw Error('Temporary synthesis failure');return {northStar:'Recovered'};}});
 await runner.begin(p);assert.equal(p.discovery.synthesisStatus,'failed');assert.equal(p.discovery.researchStatus,'completed');
 await runner.begin(p);
 assert.equal(p.discovery.synthesis.northStar,'Recovered');assert.equal(calls.start,1);assert.equal(calls.poll,1);
});

test('network failure pauses and reconnects to the same research job',async()=>{
 let checks=0;
 const {p,calls,runner}=setup({poll:async id=>{assert.equal(id,'job-one');if(++checks===1)throw Error('Offline');return {status:'completed',text:'Recovered report'};}});
 await runner.begin(p);assert.equal(p.discovery.researchStatus,'paused');
 await runner.begin(p);assert.equal(calls.start,1);assert.equal(checks,2);assert.equal(p.discovery.stage,'synthesis');
});

test('duplicate start clicks share one pending job',async()=>{
 let finish,starts=0;
 const {p,runner}=setup({start:()=>{starts++;return new Promise(resolve=>{finish=resolve;});}});
 const pending=runner.begin(p);await runner.begin(p);assert.equal(starts,1);
 finish({id:'job-one'});await pending;assert.equal(p.discovery.stage,'synthesis');
});

test('render-driven resume does not multiply polling timers',async()=>{
 const {p,calls,runner,scheduled}=setup({poll:async()=>({status:'in_progress'})});
 await runner.begin(p);runner.resume(p);runner.resume(p);
 assert.equal(scheduled.length,1);assert.equal(calls.start,1);runner.dispose();
});

test('results from replaced project state cannot overwrite its new direction',async()=>{
 let finish;
 const {p,runner}=setup({synthesize:()=>new Promise(resolve=>{finish=resolve;})});
 const pending=runner.begin(p);
 await new Promise(resolve=>setImmediate(resolve));
 p.discovery=createDiscoveryState();finish({northStar:'Old direction'});await pending;
 assert.equal(p.discovery.synthesis,null);assert.equal(p.discovery.stage,'intake');
});
