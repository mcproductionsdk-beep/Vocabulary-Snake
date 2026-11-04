import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const baseline=read('./reference/snake-game.html').match(/<script>([\s\S]*?)<\/script>/)[1];
const candidate=read('../engine/snake.js');
function runtime(source,mobile=false){
 const nodes=new Map(), messages=[], frames=new Map(); let serial=0,seed=7;
 function node(id){if(nodes.has(id))return nodes.get(id);const classes=new Set(),listeners={};const n={textContent:'',value:'',style:{},listeners,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on??!classes.has(x))classes.add(x);else classes.delete(x)}},replaceChildren(...xs){this.children=xs},addEventListener(k,fn){listeners[k]=fn},removeEventListener(k){delete listeners[k]},getBoundingClientRect:()=>({width:mobile?370:1080,height:mobile?360:600}),getContext:()=>ctx};nodes.set(id,n);return n}
 const ctx=new Proxy({measureText:t=>({width:String(t).length*9})},{get:(t,k)=>t[k]??(()=>{})});
 const math=Object.create(Math);math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 const document={getElementById:node,createElement:()=>node('bold'),querySelector:()=>node('app'),addEventListener(){},removeEventListener(){}};
 const sandbox={document,Math:math,location:{origin:'http://test.invalid'},parent:{postMessage:m=>messages.push(m)},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial},cancelAnimationFrame:id=>frames.delete(id)};
 sandbox.window=sandbox;sandbox.matchMedia=()=>({matches:mobile});sandbox.addEventListener=()=>{};sandbox.removeEventListener=()=>{};sandbox.devicePixelRatio=1;
 const expose='window.__test={state:()=>({snake,dir,nextDir,score,lives,round,done,step,misses,foods,current,queue,running,paused}),move,turn,pause,resize,setFood:(pair)=>{foods=[{x:(snake[0].x+dir.x+COLS)%COLS,y:(snake[0].y+dir.y+ROWS)%ROWS,pair:pair===true?current:vocab.find(v=>v.id!==current.id)}];invincible=0},clearFoods:()=>{foods=[]},finishRound:()=>{queue=[]},collide:()=>{snake=[{x:15,y:10},{x:16,y:10},{x:16,y:11},{x:15,y:11}];invincible=0}};';
 vm.runInNewContext(source.replace('})();',expose+'})();'),sandbox);
 const pairs=Array.from({length:6},(_,i)=>['prompt'+i,'target'+i]);
 assert.equal(sandbox.BTSnake.start({pairs,language:'es-ES'}),true);
 return {engine:sandbox.BTSnake,api:sandbox.__test,nodes,messages,frames,start:()=>sandbox.BTSnake.start({pairs,language:'es-ES'}),state:()=>JSON.parse(JSON.stringify(sandbox.__test.state()))};
}
for(const mobile of [false,true])test(`mechanics match pinned baseline (${mobile?'mobile':'desktop'})`,()=>{
 const a=runtime(baseline,mobile),b=runtime(candidate,mobile);
 const equal=()=>assert.deepEqual(b.state(),a.state());equal();
 for(const fn of [r=>r.api.turn(-1,0),r=>r.api.move(),r=>r.api.turn(0,1),r=>r.api.move(),r=>r.api.setFood(true),r=>r.api.move(),r=>r.api.setFood(false),r=>r.api.move(),r=>r.api.finishRound(),r=>r.api.setFood(true),r=>r.api.move(),r=>r.api.pause(),r=>r.api.pause(),r=>r.api.resize(),r=>r.start(),r=>r.api.collide(),r=>r.api.move()]){fn(a);fn(b);equal()}
 assert.equal(JSON.stringify(b.messages.filter(m=>m.type==="BT_SNAKE_SPEAK")),JSON.stringify(a.messages.filter(m=>m.type==="BT_SNAKE_SPEAK")));
});
test('scoring, lives, wrapping, answer direction and acceleration are preserved',()=>{
 const r=runtime(candidate),s=()=>r.state();
 assert.equal(s().current.prompt,'prompt'+s().current.id);assert.equal(s().current.target,'target'+s().current.id);
 const length=s().snake.length;r.api.setFood(true);r.api.move();assert.equal(s().score,10);assert.equal(s().snake.length,length+1);
 assert.equal(r.messages.at(-1).language,'es-ES');assert.match(r.messages.at(-1).text,/^target/);
 r.api.setFood(false);r.api.move();assert.equal(s().lives,2);
 r.api.finishRound();r.api.setFood(true);r.api.move();assert.equal(s().round,2);assert.equal(s().step,.18*.91);
 r.start();r.api.turn(-1,0);assert.deepEqual(s().nextDir,{x:1,y:0});
 r.api.clearFoods();for(let i=0;i<15;i++)r.api.move();assert.equal(s().snake[0].x,0);
 r.api.collide();r.api.move();assert.equal(s().lives,2);
});
test('engine extraction contains no service clients, vocabulary catalog or pronunciation provider',()=>{
 assert.doesNotMatch(candidate,/fetch\(|XMLHttpRequest|https:\/\/|speechSynthesis|localStorage/);
 assert.doesNotMatch(read('../snake-game.html'),/<textarea|teacherMenu|studentIntro/);
 assert.doesNotMatch(read('../engine/snake.css'),/teacherMenu|studentIntro|teacherGrid|shareStudentLink|studentMode/);
});

test('restart while paused restores overlay, controls and exactly one frame',()=>{
 const r=runtime(candidate);r.engine.pause();assert.equal(r.frames.size,0);
 assert.equal(r.nodes.get('pauseOverlay').classList.contains('show'),true);
 r.engine.restart();assert.equal(r.nodes.get('pauseOverlay').classList.contains('show'),false);
 assert.equal(r.nodes.get('pause').textContent,'PAUSE');assert.equal(r.frames.size,1);
 for(let i=0;i<30;i++){r.engine.pause();r.engine.pause();assert.equal(r.frames.size,0);r.engine.resume();r.engine.resume();assert.equal(r.frames.size,1);}
});
test('initialization waits for start; disposal removes frames and rejects further starts',()=>{
 const r=runtime(candidate);const set={pairs:Array.from({length:5},(_,i)=>['p'+i,'t'+i]),language:'da-DK'};
 assert.equal(r.engine.initialize(set),true);assert.equal(r.frames.size,0);assert.equal(r.engine.state().status,'paused');
 r.engine.resume();assert.equal(r.frames.size,1);r.engine.dispose();r.engine.dispose();assert.equal(r.frames.size,0);
 assert.equal(r.engine.state().status,'disposed');assert.equal(r.engine.start(set),false);
 assert.equal(r.nodes.get('restart').onclick,null);assert.deepEqual(r.nodes.get('touchUp').listeners,{});
});
test('invalid engine input leaves the current session unchanged',()=>{
 const r=runtime(candidate),before=r.state();
 for(const payload of [{pairs:[null,null,null,null,null],language:'es-ES'},
 {pairs:Array(5).fill(['ok',42]),language:'es-ES'},
 {pairs:Array(5).fill(['ok','target']),language:'xx-XX'}]){
  assert.equal(r.engine.start(payload),false);assert.deepEqual(r.state(),before);
 }
});
