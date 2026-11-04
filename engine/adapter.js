/* Temporary same-origin compatibility bridge. Retire when the central session bootstrap is deployed. */
(function () {
  function receive(event) {
    if (event.origin !== location.origin || event.source !== parent) return;
    if (event.data?.type === 'BT_SNAKE_PING') {
      parent.postMessage({type:'BT_SNAKE_READY'}, location.origin);
      return;
    }
    if (event.data?.type !== 'BT_SNAKE_START') return;
    const started = window.BTSnake?.start(event.data.vocabulary);
    parent.postMessage({type:started?'BT_SNAKE_STARTED':'BT_SNAKE_START_FAILED'}, location.origin);
  }
  window.BTSnakeLegacyDispose = function () {
    window.removeEventListener('message', receive);
    delete window.BTSnakeLegacyDispose;
  };
  window.addEventListener('message', receive);
  parent.postMessage({type:'BT_SNAKE_READY'}, location.origin);
})();
