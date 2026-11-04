// The owner requested viewport fitting and removal of engine menus on 2026-11-04.
// Exact legacy DOM geometry is superseded; engine.test.mjs retains baseline mechanics comparison.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox']});
const base=process.env.SNAKE_TEST_BASE||'http://127.0.0.1:8765';
try {
 for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:360,height:640},{width:844,height:390},{width:768,height:1024}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.origin!==new URL(base).origin)return route.abort();
   if(url.pathname==='/engine/snake.js'){const response=await route.fetch();const body=(await response.text()).replace('})();','window.__boost=()=>tapBoost;window.__grid=()=>({cols:COLS,rows:ROWS,W,H});})();');return route.fulfill({response,body});}
   return route.continue();
  });
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;});
  await page.goto(base+'/snake-game.html');
  await page.evaluate(()=>BTSnake.start({language:'es-ES',pairs:Array.from({length:6},(_,i)=>['prompt'+i,'target'+i])}));
  for(const paused of [false,true]){
   await page.evaluate(value=>value?BTSnake.pause():BTSnake.resume(),paused);
   const geometry=await page.evaluate(()=>{
    const bounds=id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,wrap:bounds('wrap'),canvas:bounds('canvas'),target:bounds('target')};
   });
   assert.ok(geometry.pageWidth<=viewport.width&&geometry.pageHeight<=viewport.height,JSON.stringify(geometry));
   for(const key of ['wrap','canvas','target']){const r=geometry[key];assert.ok(r.left>=0&&r.top>=0&&r.right<=viewport.width&&r.bottom<=viewport.height,JSON.stringify({key,r,viewport}));}
   assert.ok(geometry.canvas.width<=geometry.wrap.width-7&&geometry.canvas.height<=geometry.wrap.height-7);
   assert.equal(await page.locator('.logo,.buttons,#mainMenu,#overMenu,#again').count(),0);
  }
  const grid=await page.evaluate(()=>__grid());assert.ok(grid.cols>=30&&grid.rows>=20);assert.ok(Math.abs(grid.W/grid.cols-grid.H/grid.rows)<1e-8);
  const before=await page.evaluate(()=>BTSnake.state());await page.setViewportSize({width:viewport.height,height:viewport.width});const after=await page.evaluate(()=>BTSnake.state());assert.deepEqual(after,before);
  const resized=await page.evaluate(()=>__grid());assert.equal(resized.cols,grid.cols);assert.equal(resized.rows,grid.rows);assert.ok(Math.abs(resized.W/resized.cols-resized.H/resized.rows)<1e-8);
  await page.evaluate(()=>BTSnake.restart());const restarted=await page.evaluate(()=>__grid());assert.ok(restarted.cols>=30&&restarted.rows>=20);assert.ok(Math.abs(restarted.W/restarted.cols-restarted.H/restarted.rows)<1e-8);
  await page.evaluate(()=>{
   const original=Date.now;let now=1000;Date.now=()=>now;
   try{
    for(let n=0;n<8;n++){now+=100;dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',repeat:true,bubbles:true}));}
    if(__boost()!==0)throw Error('Held key added speed');
    for(let n=0;n<8;n++){now+=100;dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',repeat:false,bubbles:true}));}
    if(__boost()!==.5)throw Error('Fresh key taps did not reach cap');
    BTSnake.pause();if(__boost()!==0)throw Error('Pause kept boost');BTSnake.restart();
    if(getComputedStyle(document.querySelector('.mobile-controls')).display!=='none'){
     for(let n=0;n<8;n++){now+=100;document.getElementById('touchRight').dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,bubbles:true,cancelable:true}));}
     if(__boost()!==.5)throw Error('Touch taps did not match keyboard boost');
    }
    BTSnake.restart();if(__boost()!==0)throw Error('Restart kept boost');
   }finally{Date.now=original;}
  });
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS engine viewport and ownership ${viewport.width}x${viewport.height}`);
 }
}finally{await browser.close();}
