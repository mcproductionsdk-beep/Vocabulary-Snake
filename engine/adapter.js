parent.postMessage({type:"BT_SNAKE_READY"},location.origin);
window.addEventListener("message",function(event){
 if(event.origin!==location.origin||event.source!==parent)return;
 if(event.data?.type==="BT_SNAKE_PING"){parent.postMessage({type:"BT_SNAKE_READY"},location.origin);return;}
 if(event.data?.type!=="BT_SNAKE_START")return;
 var started=window.BTSnake?.start(event.data.vocabulary);
 parent.postMessage({type:started?"BT_SNAKE_STARTED":"BT_SNAKE_START_FAILED"},location.origin);
});
/* Main Menu events are already handled by exitToCore() above. */
