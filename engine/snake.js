(function(){"use strict";function E(x){return document.getElementById(x)}var canvas=E("canvas"),ctx=canvas.getContext("2d"),wrap=E("wrap"),game=E("game");
var COLS=30,ROWS=20,W=900,H=600,DPR=1,vocab=[],queue=[],current=null,foods=[],snake=[],dir={x:1,y:0},nextDir={x:1,y:0},misses={},score=0,lives=3,round=1,done=0,running=false,paused=false,soundOn=true,audioCtx=null,lang="de-DE",raf=0,last=0,acc=0,step=.18,invincible=0;
function initialSnake(){return [{x:15,y:10},{x:14,y:10},{x:13,y:10},{x:12,y:10}]}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function build(){queue=shuffle(vocab);queue=queue.concat(shuffle(vocab.filter(function(v){return(misses[v.id]||0)>0})));done=0}
function next(){if(!queue.length){round++;step=Math.max(.085,step*.91);build();flash("ROUND "+round+" · SNAKE SPEED UP!",1)}current=queue.shift();hud();ensureCorrectFood()}
function hud(){E("score").textContent=score;E("lives").textContent="❤".repeat(Math.max(0,lives));var heading=E("target"),bold=document.createElement("b");bold.textContent=current.prompt.toUpperCase();heading.replaceChildren("FIND: ",bold);E("progress").textContent="ROUND "+round+" · "+Math.min(done,vocab.length)+"/"+vocab.length+" WORDS"}
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
function start(pairs,locale){if(!Array.isArray(pairs)||pairs.length<5)return false;lang=locale;vocab=pairs.map(function(p,i){return{id:i,target:p[1],prompt:p[0]}});score=0;lives=3;round=1;done=0;misses={};step=.18;snake=initialSnake();dir={x:1,y:0};nextDir={x:1,y:0};foods=[];invincible=0;running=true;paused=false;last=0;acc=0;build();current=queue.shift();hud();game.classList.add("active");E("gameOver").classList.remove("show");resize();fillFoods();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);return true;}
function resetPosition(){snake=initialSnake();dir={x:1,y:0};nextDir={x:1,y:0};invincible=1}
function hurt(t){if(invincible>0)return;lives--;invincible=1;bad();flash(t,0);hud();if(lives<=0){running=false;E("gameOver").classList.add("show")}else resetPosition()}
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
function audio(){if(!soundOn)return null;try{var A=window.AudioContext||window.webkitAudioContext;if(!A)return null;if(!audioCtx)audioCtx=new A();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}catch(e){return null}}function beep(f,d,e){var a=audio();if(!a)return;var o=a.createOscillator(),g=a.createGain(),n=a.currentTime;o.type="square";o.frequency.setValueAtTime(f,n);if(e)o.frequency.exponentialRampToValueAtTime(e,n+d);g.gain.setValueAtTime(.035,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(g);g.connect(a.destination);o.start();o.stop(n+d)}function good(){beep(440,.06);setTimeout(function(){beep(660,.07)},60);setTimeout(function(){beep(880,.09)},125)}function bad(){beep(170,.17,75)}function speak(t){if(soundOn)parent.postMessage({type:"BT_SNAKE_SPEAK",text:t,language:lang},location.origin)}
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
function resize(){var r=wrap.getBoundingClientRect();W=window.matchMedia("(max-width:760px)").matches?Math.max(1,r.width):Math.max(320,r.width);H=window.matchMedia("(max-width:760px)").matches?Math.max(1,r.height):Math.max(400,r.height);DPR=Math.max(1,window.devicePixelRatio||1);canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+"px";canvas.style.height=H+"px";ctx.setTransform(DPR,0,0,DPR,0,0);if(running&&foods.length){var saved=foods.map(function(f){return f.pair});foods=[];saved.forEach(addFood);ensureCorrectFood()}draw()}
function loop(n){if(!running||paused)return;if(!last)last=n;var dt=Math.min(.05,(n-last)/1000);last=n;if(invincible>0)invincible-=dt;acc+=dt;while(acc>=step&&running){acc-=step;move()}draw();if(running)raf=requestAnimationFrame(loop)}
function turn(x,y){if(!running||paused)return;if(x===-dir.x&&y===-dir.y)return;nextDir={x:x,y:y}}
function pause(){if(!running)return;paused=!paused;E("pauseOverlay").classList.toggle("show",paused);E("pause").textContent=paused?"RESUME":"PAUSE";if(!paused){last=0;raf=requestAnimationFrame(loop)}}
E("again").onclick=function(){start(activePairs,lang)};E("restart").onclick=function(){start(activePairs,lang)};E("pause").onclick=pause;
function exitToCore(){parent.postMessage({type:"BT_SNAKE_CANCEL_SPEECH"},location.origin);running=false;paused=false;cancelAnimationFrame(raf);game.classList.remove("active");parent.postMessage({type:"BT_SNAKE_MENU"},location.origin)}
E("mainMenu").onclick=exitToCore;E("overMenu").onclick=exitToCore;
E("sound").onclick=function(){soundOn=!soundOn;if(!soundOn)parent.postMessage({type:"BT_SNAKE_CANCEL_SPEECH"},location.origin);this.textContent=soundOn?"🔊 SOUND ON":"🔇 SOUND OFF"};var fsBtn=E("fullscreen"),fsTarget=document.querySelector(".app"),expanded=false;
function embedded(){try{return window.self!==window.top}catch(e){return true}}
function fsEl(){return document.fullscreenElement||document.webkitFullscreenElement||null}
function setExpanded(on){
 expanded=on;
 fsTarget.classList.toggle("expanded",on);
 fsBtn.textContent=on?"↙ RESTORE GAME":"⛶ EXPAND GAME";
 setTimeout(resize,60);
}
function fsLabel(){
 if(fsEl()){fsBtn.textContent="⛶ EXIT FULL SCREEN"}
 else if(!expanded){fsBtn.textContent="⛶ EXPAND GAME"}
 setTimeout(resize,80)
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
document.addEventListener("fullscreenchange",fsLabel);
document.addEventListener("webkitfullscreenchange",fsLabel);
window.addEventListener("keydown",function(e){if(!game.classList.contains("active"))return;var k=e.key.toLowerCase();if(k==="arrowleft"||k==="a"){turn(-1,0);e.preventDefault()}if(k==="arrowright"||k==="d"){turn(1,0);e.preventDefault()}if(k==="arrowup"||k==="w"){turn(0,-1);e.preventDefault()}if(k==="arrowdown"||k==="s"){turn(0,1);e.preventDefault()}if(k==="p"&&!e.repeat)pause()});
/* Touch buttons call the existing turn() function; no desktop key handling changes. */
[["touchUp",0,-1],["touchLeft",-1,0],["touchDown",0,1],["touchRight",1,0]].forEach(function(spec){
  var button=E(spec[0]);
  button.addEventListener("pointerdown",function(ev){
    if(!running||paused)return;
    ev.preventDefault();
    turn(spec[1],spec[2]);
    if(button.setPointerCapture)try{button.setPointerCapture(ev.pointerId)}catch(err){}
  },{passive:false});
  button.addEventListener("contextmenu",function(ev){ev.preventDefault()});
});
/* Optional swipe steering on the board, without changing keyboard controls. */
var swipeStart=null;
canvas.addEventListener("pointerdown",function(ev){
  if(ev.pointerType==="mouse"||!running||paused)return;
  swipeStart={id:ev.pointerId,x:ev.clientX,y:ev.clientY};
},{passive:true});
canvas.addEventListener("pointerup",function(ev){
  if(!swipeStart||ev.pointerId!==swipeStart.id)return;
  var dx=ev.clientX-swipeStart.x,dy=ev.clientY-swipeStart.y;
  swipeStart=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<22||!running||paused)return;
  if(Math.abs(dx)>Math.abs(dy))turn(dx>0?1:-1,0);
  else turn(0,dy>0?1:-1);
},{passive:true});
canvas.addEventListener("pointercancel",function(){swipeStart=null});
window.addEventListener("blur",function(){swipeStart=null});
window.addEventListener("resize",resize);

/* Core owns categories, vocabulary, voice testing and student sharing. */
var activePairs=[];
window.BTSnake={start:function(payload){
 if(!payload||!Array.isArray(payload.pairs)||payload.pairs.length<5)return false;
 activePairs=payload.pairs.map(function(p){return[p[0],p[1]]});
 E("language").value=payload.language;
 return start(activePairs,payload.language);
}};
})();
