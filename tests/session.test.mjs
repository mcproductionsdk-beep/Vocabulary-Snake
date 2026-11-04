import test from 'node:test';
import assert from 'node:assert/strict';
import { attachSnakeSession } from '../engine/session.mjs';
function fixture(){
 const events=new Map(),sent=[],calls=[];let status='idle',listener;
 const hostWindow={location:{origin:'https://engine.invalid'},addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k)};
 const parentWindow={};
 const engine={subscribe(fn){listener=fn;return true},initialize(set){calls.push('init');status='paused';return set.pairs.every(p=>p?.length===2)},
 resume(){calls.push('resume');status='running';return true},pause(){calls.push('pause');status='paused';return true},
 restart(){calls.push('restart');return true},setSound(v){calls.push('sound');return typeof v==='boolean'},
 resize(){calls.push('resize')},dispose(){calls.push('dispose');status='disposed'},state:()=>({status})};
 const policy={shellOrigin:'https://shell.invalid',engineOrigin:hostWindow.location.origin,buildId:'a'.repeat(40)};
 const adapter=attachSnakeSession({engine,policy,hostWindow,parentWindow,post:m=>sent.push(m)});
 const vocabulary={family:'vocabulary',schemaVersion:1,title:'Accents',promptLanguage:'da-DK',language:'es-ES',pairs:Array(5).fill(['træ','árbol'])};
 function send(type,id,payload={},overrides={},event={}) {events.get('message')?.({origin:policy.shellOrigin,source:parentWindow,data:{protocol:'bt-vocabulary-engine/1',engineId:'vocabulary-snake',sessionId:'test_session',requestId:String(id),type,payload,...overrides},...event})}
 return {adapter,send,sent,calls,events,listener:()=>listener,init:()=>send('INIT',1,{vocabulary,soundOn:true}),vocabulary};
}
test('no trusted engine policy means no ready message or listener',()=>{
 let sent=0;assert.throws(()=>attachSnakeSession({post:()=>sent++,hostWindow:{},policy:null,engine:{}}));assert.equal(sent,0);
});
test('origin, sender, protocol and session must match',()=>{
 const f=fixture();assert.equal(f.sent[0].type,'READY');
 f.send('INIT',1,{}, {},{origin:'https://evil.invalid'});f.send('INIT',1,{}, {},{source:{}});
 f.send('INIT',1,{}, {protocol:'old/0'});assert.equal(f.calls.length,0);
 f.init();f.send('START',2,{}, {sessionId:'old_session'});assert.equal(f.calls.includes('resume'),false);
});
test('initialize waits; duplicates and stale command IDs cannot repeat effects',()=>{
 const f=fixture();f.init();assert.equal(f.sent.at(-1).type,'INITIALIZED');assert.equal(f.calls.includes('resume'),false);
 f.send('START',2);f.send('START',2);assert.equal(f.calls.filter(x=>x==='resume').length,1);
 f.send('INIT',3,{vocabulary:f.vocabulary,soundOn:true});assert.equal(f.sent.at(-1).payload.code,'ALREADY_INITIALIZED');
 f.send('RESTART',1);assert.equal(f.calls.includes('restart'),false);
});
test('invalid init and commands are explicit errors, never successful starts',()=>{
 const f=fixture();f.send('START',1);assert.equal(f.calls.length,0);
 f.send('INIT',2,{vocabulary:{...f.vocabulary,promptLanguage:'es-ES'},soundOn:true});assert.equal(f.sent.at(-1).type,'ERROR');
 f.init(); // request 1 is stale after rejected request 2
 assert.equal(f.calls.length,0);
 f.send('INIT',3,{vocabulary:f.vocabulary,soundOn:true});
 f.send('VIEWPORT',4,{width:Infinity,height:3,pixelRatio:1});assert.equal(f.sent.at(-1).payload.code,'INVALID_VIEWPORT');
 f.send('UNKNOWN',5);assert.equal(f.sent.at(-1).payload.code,'UNKNOWN_COMMAND');
});
test('disposal removes listener and prevents late messages and speech',()=>{
 const f=fixture();f.init();f.listener()({type:'BT_SNAKE_SPEAK',text:'árbol',language:'es-ES'});assert.equal(f.sent.at(-1).type,'SPEAK');
 f.send('DISPOSE',2);assert.equal(f.sent.at(-1).payload.state.status,'disposed');assert.equal(f.events.size,0);
 const count=f.sent.length;f.listener()({type:'BT_SNAKE_SPEAK',text:'late'});f.send('START',3);f.adapter.dispose();
 assert.equal(f.sent.length,count);assert.equal(f.calls.filter(x=>x==='dispose').length,1);
});
test('evicted command replies stay rejected as stale, never replayed',()=>{
 const f=fixture();f.init();for(let i=2;i<140;i++)f.send('PAUSE',i);
 const count=f.calls.length;f.send('RESTART',1);assert.equal(f.sent.at(-1).payload.code,'STALE_COMMAND');assert.equal(f.calls.length,count);
});
