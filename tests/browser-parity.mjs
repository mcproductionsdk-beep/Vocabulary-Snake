// The owner requested viewport fitting and removal of engine menus on 2026-11-04.
// Exact legacy DOM geometry is superseded; engine.test.mjs retains baseline mechanics comparison.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox']});
const base=process.env.SNAKE_TEST_BASE||'http://127.0.0.1:8765';
try {
 for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:360,height:640},{width:844,height:390},{width:768,height:1024}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
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
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS engine viewport and ownership ${viewport.width}x${viewport.height}`);
 }
}finally{await browser.close();}
