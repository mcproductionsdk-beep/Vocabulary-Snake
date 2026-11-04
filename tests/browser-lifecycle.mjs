import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const base=process.env.SNAKE_TEST_BASE||'http://127.0.0.1:8765';
const shellOrigin=new URL(base).origin;
const engineOrigin=base.replace('127.0.0.1','localhost');
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}}),external=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(![shellOrigin,new URL(engineOrigin).origin].includes(url.origin)){external.push(url.href);await route.abort();return;}
  if(url.href===base+'/tests/lifecycle-harness.html'){
   await route.fulfill({contentType:'text/html',body:`<!doctype html><title>Isolated session test</title><iframe title="Snake" src="${engineOrigin}/snake-game.html" style="width:370px;height:790px;border:0"></iframe><script>window.events=[];addEventListener('message',e=>events.push(e.data))</script>`});return;
  }
  if(url.href===engineOrigin+'/snake-game.html'){
   const response=await route.fetch(),body=await response.text();
   const bootstrap=`<script type="module">import {attachSnakeSession} from './engine/session.mjs';attachSnakeSession({engine:window.BTSnake,policy:{shellOrigin:${JSON.stringify(shellOrigin)},engineOrigin:location.origin,buildId:'${'a'.repeat(40)}',allowLoopback:true}});</script>`;
   await route.fulfill({response,body:body.replace('</body>',bootstrap+'</body>')});return;
  }
  await route.continue();
 });
 await page.goto(base+'/tests/lifecycle-harness.html');
 await page.waitForFunction(()=>events.some(e=>e.protocol==='bt-vocabulary-engine/1'&&e.type==='READY'));
 let sequence=0;
 async function command(type,payload={}){
  const requestId=String(++sequence);
  await page.evaluate(({type,payload,requestId,engineOrigin})=>document.querySelector('iframe').contentWindow.postMessage({protocol:'bt-vocabulary-engine/1',engineId:'vocabulary-snake',sessionId:'browser_test',requestId,type,payload},engineOrigin),{type,payload,requestId,engineOrigin:new URL(engineOrigin).origin});
  await page.waitForFunction(id=>events.some(e=>e.requestId===id),requestId);
  return page.evaluate(id=>events.find(e=>e.requestId===id),requestId);
 }
 const vocabulary={family:'vocabulary',schemaVersion:1,title:'Dansk → Español',promptLanguage:'da-DK',language:'es-ES',pairs:[['kat','gato'],['hund','perro'],['fugl','pájaro'],['fisk','pez'],['træ','árbol']]};
 assert.equal((await command('INIT',{vocabulary,soundOn:false})).type,'INITIALIZED');
 assert.equal((await command('START')).payload.state.status,'running');
 const frame=page.frames().find(f=>f.url().startsWith(engineOrigin+'/snake-game.html'));
 assert.ok(frame);
 await command('PAUSE');assert.equal(await frame.locator('#pauseOverlay').evaluate(el=>el.classList.contains('show')),true);
 assert.equal((await command('RESTART')).payload.state.status,'running');
 assert.equal(await frame.locator('#pauseOverlay').evaluate(el=>el.classList.contains('show')),false);
 assert.equal(await frame.locator('#pause').count(),0);
 await frame.evaluate(()=>dispatchEvent(new Event('blur')));
 assert.equal(await frame.evaluate(()=>BTSnake.state().status),'paused');
 const before=await frame.evaluate(()=>BTSnake.state());await page.setViewportSize({width:844,height:390});
 const after=await frame.evaluate(()=>BTSnake.state());assert.equal(after.score,before.score);assert.equal(after.lives,before.lives);assert.equal(after.status,'paused');
 await command('RESUME');assert.equal((await command('DISPOSE')).payload.state.status,'disposed');
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log('PASS actual cross-origin INIT/start/pause/restart/background/resize/dispose; zero external requests');
} finally {await browser.close();}
