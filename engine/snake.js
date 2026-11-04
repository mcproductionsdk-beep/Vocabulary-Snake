(function(){"use strict";function E(x){return document.getElementById(x)}var canvas=E("canvas"),ctx=canvas.getContext("2d"),wrap=E("wrap"),game=E("game");
var COLS=30,ROWS=20,W=900,H=600,DPR=1,vocab=[],queue=[],current=null,foods=[],snake=[],dir={x:1,y:0},nextDir={x:1,y:0},misses={},score=0,lives=3,round=1,done=0,running=false,paused=false,soundOn=true,audioCtx=null,lang="de-DE",raf=0,last=0,acc=0,step=.18,invincible=0;
var disposed=false, eventListener=null, effectTimers=new Set(), oscillators=new Set(), listeners=[];
function listen(target,type,callback,options){target.addEventListener(type,callback,options);listeners.push(function(){target.removeEventListener(type,callback,options)})}
function emit(type,payload){if(eventListener)eventListener(Object.assign({type:type},payload));else parent.postMessage(Object.assign({type:type},payload),location.origin)}
function later(callback,delay){var timer=setTimeout(function(){effectTimers.delete(timer);if(!disposed)callback()},delay);effectTimers.add(timer);return timer}
function clearEffects(){oscillators.forEach(function(o){try{o.stop()}catch(e){}});oscillators.clear();effectTimers.forEach(clearTimeout);effectTimers.clear();clearTimeout(flash.t);E("toast").style.display="none"}
function state(){return{status:disposed?"disposed":!running?"ended":paused?"paused":"running",score:score,lives:lives,round:round,done:done,soundOn:soundOn}}
function initialSnake(){return [{x:15,y:10},{x:14,y:10},{x:13,y:10},{x:12,y:10}]}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function build(){queue=shuffle(vocab);queue=queue.concat(shuffle(vocab.filter(function(v){return(misses[v.id]||0)>0})));done=0}
function next(){if(!queue.length){round++;step=Math.max(.085,step*.91);build();flash("ROUND "+round+" · SNAKE SPEED UP!",1)}current=queue.shift();hud();ensureCorrectFood()}
function hud(){E("score").textContent=score;E("lives").textContent="❤".repeat(Math.max(0,lives));var heading=E("target"),bold=document.createElement("b");bold.textContent=current.prompt.toUpperCase();heading.replaceChildren("FIND: ",bold);E("progress").textContent="ROUND "+round+" · "+Math.min(done,vocab.length)+"/"+vocab.length+" WORDS";if(eventListener)emit("BT_SNAKE_STATE",state())}
/* Food cards are full collision targets; placement reserves their entire visual footprint. */
function foodGeometry(f){
 var cw=W/COLS,ch=H/ROWS,x=(f.x+.5)*cw,y=(f.y+.5)*ch;
 var font=Math.max(10,Math.min(17,W*.029,H*.029));
 ctx.font="900 "+font+"px Courier New";
 var measured=ctx.measureText(f.pair.target).width+18;
 var width=Math.min(Math.max(68,measured),W*.43),height=Math.max(27,Math.min(34,H*.055));
 return{x:x-width/2,y:y-height/2,w:width,h:height,font:font};
}
function intersects(a,b,gap){
 return a.x<a.x+a.w&&a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
}
function foodSpace(f){
 var b=foodGeometry(f),margin=5;
 if(b.x<margin||b.y<margin||b.x+b.w>W-margin||b.y+b.h>H-margin)return false;
 if(foods.some(function(other){return intersects(b,foodGeometry(other),9)}))return false;
 var cw=W/COLS,ch=H/ROWS;
 return !snake.some(function(seg){return intersects(b,{x:seg.x*cw,y:seg.y*ch,w:cw,h:ch},7)});
}
function addFood(pair){
 var candidates=[];
 for(var y=1;y<ROWS-1;y++)for(var x=1;x<COLS-1;x++)candidates.push({x:x,y:y,pair:pair});
 candidates=shuffle(candidates);
 for(var i=0;i<candidates.length;i++){if(foodSpace(candidates[i])){foods.push(candidates[i]);return true}}
 return false;
}
function fillFoods(){
 foods=[];addFood(current);
 var choices=shuffle(vocab.filter(function(v){return v.id!==current.id}));
 var count=window.matchMedia("(max-width:760px)").matches?4:6;
 for(var i=0;i<count-1;i++)addFood(choices[i%choices.length]);
}
function ensureCorrectFood(){
 if(!current)return;
 if(foods.some(function(f){return f.pair.id===current.id}))return;
 /* Free room for the required correct answer before any distractor. */
 while(!addFood(current)&&foods.length)foods.pop();
}
function start(pairs,locale,defer){if(disposed||!validPayload({pairs:pairs,language:locale}))return false;clearEffects();lang=locale;vocab=pairs.map(function(p,i){return{id:i,target:p[1],prompt:p[0]}});score=0;lives=3;round=1;done=0;misses={};step=.18;snake=initialSnake();dir={x:1,y:0};nextDir={x:1,y:0};foods=[];invincible=0;running=true;paused=!!defer;last=0;acc=0;build();current=queue.shift();hud();game.classList.add("active");E("gameOver").classList.remove("show");E("pauseOverlay").classList.toggle("show",paused);E("pause").textContent=paused?"RESUME":"PAUSE";swipeStart=null;resize();fillFoods();cancelAnimationFrame(raf);raf=0;if(!paused)raf=requestAnimationFrame(loop);return true;}
function resetPosition(){snake=initialSnake();dir={x:1,y:0};nextDir={x:1,y:0};invincible=1}
function hurt(t){if(invincible>0)return;lives--;invincible=1;bad();flash(t,0);hud();if(lives<=0){running=false;E("gameOver").classList.add("show");if(eventListener)emit("BT_SNAKE_STATE",state())}else resetPosition()}
function move(){
 dir=nextDir;var h=snake[0],nh={x:(h.x+dir.x+COLS)%COLS,y:(h.y+dir.y+ROWS)%ROWS};
 if(snake.some(function(seg,i){return i>0&&seg.x===nh.x&&seg.y===nh.y})){hurt("OUCH!");return}
 snake.unshift(nh);
 var cw=W/COLS,ch=H/ROWS,head={x:nh.x*cw,y:nh.y*ch,w:cw,h:ch};
 var fi=foods.findIndex(function(f){return intersects(head,foodGeometry(f),0)});
 if(fi>=0){
  var f=foods[fi];foods.splice(fi,1);
  if(f.pair.id===current.id){
   score+=10;done++;misses[current.id]=Math.max(0,(misses[current.id]||0)-1);
   good();speak(f.pair.target);flash("✓ "+f.pair.target.toUpperCase(),1);
   next();var pool=vocab.filter(function(v){return v.id!==current.id});
   addFood(pool[Math.floor(Math.random()*pool.length)]);ensureCorrectFood();
  }else{
   misses[current.id]=Math.min(2,(misses[current.id]||0)+1);
   hurt("WRONG: "+f.pair.target.toUpperCase());
   addFood(f.pair);ensureCorrectFood();snake.pop();
  }
 }else snake.pop();
}
function audio(){if(disposed||!soundOn)return null;try{var A=window.AudioContext||window.webkitAudioContext;if(!A)return null;if(!audioCtx)audioCtx=new A();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}catch(e){return null}}function beep(f,d,e){var a=audio();if(!a)return;var o=a.createOscillator(),g=a.createGain(),n=a.currentTime;o.type="square";o.frequency.setValueAtTime(f,n);if(e)o.frequency.exponentialRampToValueAtTime(e,n+d);g.gain.setValueAtTime(.035,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(g);g.connect(a.destination);oscillators.add(o);o.onended=function(){oscillators.delete(o)};o.start();o.stop(n+d)}function good(){beep(440,.06);later(function(){beep(660,.07)},60);later(function(){beep(880,.09)},125)}function bad(){beep(170,.17,75)}function speak(t){if(soundOn)emit("BT_SNAKE_SPEAK",{text:t,language:lang})}
function flash(t,ok){var x=E("toast");x.textContent=t;x.style.color=ok?"#79ff70":"#ff6b77";x.style.display="block";clearTimeout(flash.t);flash.t=setTimeout(function(){x.style.display="none"},650)}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
function drawFood(f){
 var b=foodGeometry(f),font=b.font;
 rect(b.x-3,b.y-3,b.w+6,b.h+6,"#0c1938");
 rect(b.x,b.y,b.w,b.h,"#f6e8bd");
 ctx.fillStyle="#15254a";ctx.textAlign="center";ctx.textBaseline="middle";
 /* Reduce font rather than crop the actual vocabulary answer. */
 ctx.font="900 "+font+"px Courier New";
 while(font>8&&ctx.measureText(f.pair.target).width>b.w-9){
  font-=.5;ctx.font="900 "+font+"px Courier New";
 }
 ctx.fillText(f.pair.target,b.x+b.w/2,b.y+b.h/2);
}
function drawSnake(){var cw=W/COLS,ch=H/ROWS;snake.forEach(function(s,i){var x=s.x*cw,y=s.y*ch,pad=2;if(i===0){rect(x+pad,y+pad,cw-pad*2,ch-pad*2,"#72dc60");rect(x+cw*.18,y+ch*.18,cw*.64,ch*.64,"#96ed70");var ex=dir.x>=0?cw*.65:cw*.18;rect(x+ex,y+ch*.22,Math.max(2,cw*.12),Math.max(2,ch*.12),"#0c1938");rect(x+ex,y+ch*.62,Math.max(2,cw*.12),Math.max(2,ch*.12),"#0c1938")}else{rect(x+pad,y+pad,cw-pad*2,ch-pad*2,i%2?"#4cae4b":"#58c957")}});if(current&&snake.length){var h=snake[0],x=(h.x+.5)*cw,y=(h.y+.5)*ch,t=current.prompt.toUpperCase();ctx.font="900 "+Math.max(13,Math.min(18,H*.030))+"px Courier New";ctx.textAlign="center";var tw=Math.min(Math.max(82,ctx.measureText(t).width+18),W*.30),py=y+ch*.78;rect(x-tw/2-2,py,tw+4,24,"#0c1938");rect(x-tw/2,py+2,tw,20,"#f2d64b");ctx.fillStyle="#15254a";ctx.fillText(t,x,py+13,tw-5)}}
function draw(){ctx.clearRect(0,0,W,H);rect(0,0,W,H,"#163f45");var cw=W/COLS,ch=H/ROWS;for(var y=0;y<ROWS;y++)for(var x=0;x<COLS;x++){if((x+y)%2===0)rect(x*cw,y*ch,cw,ch,"#18484c")}ctx.strokeStyle="#2b6761";ctx.lineWidth=1;for(var gx=0;gx<=COLS;gx++){ctx.beginPath();ctx.moveTo(gx*cw,0);ctx.lineTo(gx*cw,H);ctx.stroke()}for(var gy=0;gy<=ROWS;gy++){ctx.beginPath();ctx.moveTo(0,gy*ch);ctx.lineTo(W,gy*ch);ctx.stroke()}foods.forEach(drawFood);drawSnake()}
function resize(){if(disposed)return;var r=wrap.getBoundingClientRect();W=window.matchMedia("(max-width:760px)").matches?Math.max(1,r.width):Math.max(320,r.width);H=window.matchMedia("(max-width:760px)").matches?Math.max(1,r.height):Math.max(400,r.height);DPR=Math.max(1,window.devicePixelRatio||1);canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+"px";canvas.style.height=H+"px";ctx.setTransform(DPR,0,0,DPR,0,0);if(running&&foods.length){var saved=foods.map(function(f){return f.pair});foods=[];saved.forEach(addFood);ensureCorrectFood()}draw()}
function loop(n){raf=0;if(disposed||!running||paused)return;if(!last)last=n;var dt=Math.min(.05,(n-last)/1000);last=n;if(invincible>0)invincible-=dt;acc+=dt;while(acc>=step&&running){acc-=step;move()}draw();if(running)raf=requestAnimationFrame(loop)}
function turn(x,y){if(!running||paused)return;if(x===-dir.x&&y===-dir.y)return;nextDir={x:x,y:y}}
function setPaused(value){if(disposed||!running)return false;if(paused===value)return true;paused=value;swipeStart=null;cancelAnimationFrame(raf);raf=0;last=0;E("pauseOverlay").classList.toggle("show",paused);E("pause").textContent=paused?"RESUME":"PAUSE";if(paused){clearEffects();emit("BT_SNAKE_CANCEL_SPEECH")}else raf=requestAnimationFrame(loop);emit("BT_SNAKE_STATE",state());return true}
function pause(){return setPaused(!paused)}
function setSound(value){if(disposed||typeof value!=="boolean")return false;soundOn=value;if(!soundOn){clearEffects();emit("BT_SNAKE_CANCEL_SPEECH")}E("sound").textContent=soundOn?"🔊 SOUND ON":"🔇 SOUND OFF";return true}
function dispose(){if(disposed)return;running=false;paused=false;disposed=true;if(window.BTSnakeLegacyDispose)window.BTSnakeLegacyDispose();cancelAnimationFrame(raf);raf=0;swipeStart=null;clearEffects();listeners.forEach(function(remove){remove()});listeners=[];["again","restart","pause","mainMenu","overMenu","sound","fullscreen"].forEach(function(id){E(id).onclick=null});if(audioCtx){try{var closed=audioCtx.close();if(closed&&closed.catch)closed.catch(function(){})}catch(e){}audioCtx=null}game.classList.remove("active");emit("BT_SNAKE_CANCEL_SPEECH");eventListener=null}

E("again").onclick=function(){start(activePairs,lang)};E("restart").onclick=function(){start(activePairs,lang)};E("pause").onclick=pause;
function exitToCore(){emit("BT_SNAKE_CANCEL_SPEECH");running=false;paused=false;cancelAnimationFrame(raf);game.classList.remove("active");emit("BT_SNAKE_MENU")}
E("mainMenu").onclick=exitToCore;E("overMenu").onclick=exitToCore;
E("sound").onclick=function(){setSound(!soundOn)};var fsBtn=E("fullscreen"),fsTarget=document.querySelector(".app"),expanded=false;
function embedded(){try{return window.self!==window.top}catch(e){return true}}
function fsEl(){return document.fullscreenElement||document.webkitFullscreenElement||null}
function setExpanded(on){
 if(disposed)return;
 expanded=on;
 fsTarget.classList.toggle("expanded",on);
 fsBtn.textContent=on?"↙ RESTORE GAME":"⛶ EXPAND GAME";
 later(resize,60);
}
function fsLabel(){
 if(disposed)return;
 if(fsEl()){fsBtn.textContent="⛶ EXIT FULL SCREEN"}
 else if(!expanded){fsBtn.textContent="⛶ EXPAND GAME"}
 later(resize,80)
}
fsBtn.onclick=function(){
 if(embedded()){
   setExpanded(!expanded);
   return;
 }
 if(expanded){setExpanded(false);return}
 try{
   if(!fsEl()){
     var r=fsTarget.requestFullscreen||fsTarget.webkitRequestFullscreen;
     if(r){
       var result=r.call(fsTarget);
       if(result&&result.catch)result.catch(function(){setExpanded(true)});
     }else setExpanded(true);
   }else{
     var x=document.exitFullscreen||document.webkitExitFullscreen;
     if(x)x.call(document);
   }
 }catch(e){setExpanded(true)}
};
listen(document,"fullscreenchange",fsLabel);
listen(document,"webkitfullscreenchange",fsLabel);
listen(window,"keydown",function(e){if(!game.classList.contains("active"))return;var k=e.key.toLowerCase();if(k==="arrowleft"||k==="a"){turn(-1,0);e.preventDefault()}if(k==="arrowright"||k==="d"){turn(1,0);e.preventDefault()}if(k==="arrowup"||k==="w"){turn(0,-1);e.preventDefault()}if(k==="arrowdown"||k==="s"){turn(0,1);e.preventDefault()}if(k==="p"&&!e.repeat)pause()});
/* Touch buttons call the existing turn() function; no desktop key handling changes. */
[["touchUp",0,-1],["touchLeft",-1,0],["touchDown",0,1],["touchRight",1,0]].forEach(function(spec){
  var button=E(spec[0]);
  listen(button,"pointerdown",function(ev){
    if(!running||paused)return;
    ev.preventDefault();
    turn(spec[1],spec[2]);
    if(button.setPointerCapture)try{button.setPointerCapture(ev.pointerId)}catch(err){}
  },{passive:false});
  listen(button,"contextmenu",function(ev){ev.preventDefault()});
});
/* Optional swipe steering on the board, without changing keyboard controls. */
var swipeStart=null;
listen(canvas,"pointerdown",function(ev){
  if(ev.pointerType==="mouse"||!running||paused)return;
  swipeStart={id:ev.pointerId,x:ev.clientX,y:ev.clientY};
},{passive:true});
listen(canvas,"pointerup",function(ev){
  if(!swipeStart||ev.pointerId!==swipeStart.id)return;
  var dx=ev.clientX-swipeStart.x,dy=ev.clientY-swipeStart.y;
  swipeStart=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<22||!running||paused)return;
  if(Math.abs(dx)>Math.abs(dy))turn(dx>0?1:-1,0);
  else turn(0,dy>0?1:-1);
},{passive:true});
listen(canvas,"pointercancel",function(){swipeStart=null});
listen(window,"blur",function(){swipeStart=null;if(running)setPaused(true)});
listen(document,"visibilitychange",function(){if(document.hidden&&running)setPaused(true)});
listen(window,"resize",resize);

/* Core owns categories, vocabulary, voice testing and student sharing. */
var activePairs=[];
function validPayload(payload){return !!payload&&Array.isArray(payload.pairs)&&payload.pairs.length>=5&&/^(en-US|es-ES|de-DE|da-DK|fr-FR|it-IT)$/.test(payload.language)&&payload.pairs.every(function(p){return Array.isArray(p)&&p.length===2&&p.every(function(v){return typeof v==="string"&&!!v.trim()})})}
function launch(payload,defer){if(disposed||!validPayload(payload))return false;activePairs=payload.pairs.map(function(p){return[p[0],p[1]]});E("language").value=payload.language;emit("BT_SNAKE_CANCEL_SPEECH");return start(activePairs,payload.language,defer)}
window.BTSnake={
 start:function(payload){return launch(payload,false)},
 initialize:function(payload){return launch(payload,true)},
 pause:function(){return setPaused(true)},resume:function(){return setPaused(false)},
 restart:function(){if(disposed||!activePairs.length)return false;emit("BT_SNAKE_CANCEL_SPEECH");return start(activePairs,lang)},
 setSound:setSound,resize:resize,state:state,dispose:dispose,
 setShellManaged:function(value){if(disposed||typeof value!=="boolean")return false;fsTarget.classList.toggle("shell-managed",value);resize();return true},
 subscribe:function(listener){if(disposed||eventListener||typeof listener!=="function")return false;eventListener=listener;return true}
};
})();
