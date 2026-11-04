import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox']});
const base=process.env.SNAKE_TEST_BASE||'http://127.0.0.1:8765';
try {
for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:360,height:640},{width:844,height:390},{width:768,height:1024}]){
 const pages=[];
 for(const path of ['/tests/reference/snake-game.html','/snake-game.html']){
  const page=await browser.newPage({viewport});pages.push(page);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  await page.addInitScript(()=>{let seed=7;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);window.requestAnimationFrame=()=>1;});
  await page.goto(base+path);
  await page.evaluate(()=>window.BTSnake.start({language:'es-ES',pairs:Array.from({length:6},(_,i)=>['prompt'+i,'target'+i])}));
  assert.deepEqual(errors,[]);
 }
 for(const state of ['normal','paused','gameover','expanded']){
  const snapshots=[];
  for(const page of pages){
   await page.evaluate(state=>{
    document.getElementById('pauseOverlay').classList.toggle('show',state==='paused');
    document.getElementById('gameOver').classList.toggle('show',state==='gameover');
    document.querySelector('.app').classList.toggle('expanded',state==='expanded');
    window.dispatchEvent(new Event('resize'));
   },state);
   snapshots.push(await page.evaluate(()=>[...document.querySelectorAll('main,main *')].filter(el=>!el.closest('[hidden]')).map(el=>{
    const style=getComputedStyle(el),rect=el.getBoundingClientRect();
    return {tag:el.tagName,id:el.id,classes:el.className,box:[rect.x,rect.y,rect.width,rect.height],css:Object.fromEntries([...style].map(k=>[k,style.getPropertyValue(k)]))};
   })));
  }
  assert.equal(snapshots[1].length,snapshots[0].length);
  for(let i=0;i<snapshots[0].length;i++){
   const expected=snapshots[0][i],actual=snapshots[1][i];
   assert.deepEqual(actual.box,expected.box,`Geometry ${viewport.width} ${state} ${actual.tag}#${actual.id}`);
   const diffs=Object.keys(expected.css).filter(k=>actual.css[k]!==expected.css[k]).map(k=>[k,expected.css[k],actual.css[k]]);
   assert.deepEqual(diffs,[],`Styles ${viewport.width} ${state} ${actual.tag}#${actual.id}`);
  }
 }
 for(const page of pages)await page.close();
 console.log(`PASS baseline layout parity ${viewport.width}x${viewport.height}`);
}
} finally {await browser.close();}
