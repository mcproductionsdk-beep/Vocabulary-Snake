const PROTOCOL = 'bt-vocabulary-engine/1';
const ENGINE_ID = 'vocabulary-snake';
const LOCALES = ['en-US', 'es-ES', 'de-DE', 'da-DK', 'fr-FR', 'it-IT'];
function origin(value, allowLoopback) {
  try { const url = new URL(value);return url.origin === value && (url.protocol === 'https:' || (allowLoopback === true && url.protocol === 'http:' && ['127.0.0.1','localhost','[::1]'].includes(url.hostname))); }
  catch { return false; }
}

// Called by a trusted deployment bootstrap. No policy defaults or query-string configuration.
export function attachSnakeSession({engine, policy, hostWindow = window, parentWindow = parent, post} = {}) {
  if (!engine || !policy || !origin(policy.shellOrigin, policy.allowLoopback) || !origin(policy.engineOrigin, policy.allowLoopback) ||
      policy.engineOrigin !== hostWindow.location.origin || !/^[a-f0-9]{40}$/.test(policy.buildId)) {
    throw new Error('INVALID_ENGINE_POLICY');
  }
  const send = post ?? (message => parentWindow.postMessage(message, policy.shellOrigin));
  let sessionId = null, initialized = false, disposed = false, lastSequence = 0;
  const responses = new Map();
  const envelope = (type, requestId, payload) => ({protocol: PROTOCOL, engineId: ENGINE_ID,
    sessionId, type, ...(requestId ? {requestId} : {}), payload});
  function emit(type, requestId, payload) {send(envelope(type, requestId, payload));}
  function error(requestId, code) {emit('ERROR', requestId, {code});}
  function cleanup() {
    if (disposed) return;
    disposed = true;
    hostWindow.removeEventListener('message', receive);
    engine.dispose();
    responses.clear();
  }
  function remember(requestId, response) {
    responses.set(requestId, response);
    if (responses.size > 128) responses.delete(responses.keys().next().value);
  }
  function receive(event) {
    if (disposed || event.source !== parentWindow || event.origin !== policy.shellOrigin) return;
    const message = event.data;
    if (!message || message.protocol !== PROTOCOL || message.engineId !== ENGINE_ID ||
        typeof message.sessionId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(message.sessionId) ||
        typeof message.requestId !== 'string' || !/^[1-9][0-9]{0,14}$/.test(message.requestId) ||
        !message.payload || typeof message.payload !== 'object' || Array.isArray(message.payload)) return;
    const {type, requestId, payload} = message;
    if (sessionId && message.sessionId !== sessionId) return;
    if (responses.has(requestId)) {send(responses.get(requestId));return;}
    const sequence = Number(requestId);
    if (sequence <= lastSequence) {error(requestId, 'STALE_COMMAND');return;}
    if (!sessionId && type !== 'INIT') return;
    if (!sessionId) sessionId = message.sessionId;
    lastSequence = sequence;
    let code = null, responseType = 'ACK';
    try {
      switch (type) {
        case 'INIT': {
          const set = payload.vocabulary;
          if (initialized) {code = 'ALREADY_INITIALIZED';break;}
          if (!set || set.family !== 'vocabulary' || set.schemaVersion !== 1 ||
              typeof set.title !== 'string' || !set.title.trim() ||
              !LOCALES.includes(set.promptLanguage) || !LOCALES.includes(set.language) ||
              set.promptLanguage === set.language || typeof payload.soundOn !== 'boolean') {
            code = 'INVALID_INIT';break;
          }
          if (!engine.initialize(set)) {code = 'INVALID_INIT';break;}
          engine.setSound(payload.soundOn);
          initialized = true;responseType = 'INITIALIZED';break;
        }
        case 'START': case 'RESUME':
          if (!initialized || !engine.resume()) code = 'INVALID_STATE';break;
        case 'PAUSE':
          if (!initialized || !engine.pause()) code = 'INVALID_STATE';break;
        case 'RESTART':
          if (!initialized || !engine.restart()) code = 'INVALID_STATE';break;
        case 'SET_SOUND':
          if (!initialized || !engine.setSound(payload.soundOn)) code = 'INVALID_SOUND';break;
        case 'VIEWPORT':
          // Layout is established by the shell frame; no arbitrary dimensions enter mechanics.
          if (!initialized || ![payload.width,payload.height,payload.pixelRatio].every(n=>Number.isFinite(n)&&n>0)) {
            code = 'INVALID_VIEWPORT';break;
          }
          engine.resize();break;
        case 'DISPOSE': cleanup();break;
        default: code = 'UNKNOWN_COMMAND';
      }
    } catch {code = 'ENGINE_ERROR';cleanup();}
    const response = envelope(code ? 'ERROR' : responseType, requestId,
      code ? {code} : {state: engine.state()});
    if (!disposed) remember(requestId, response);
    send(response);
  }
  if (!engine.subscribe(event => {
    if (!sessionId || disposed) return;
    const types = {BT_SNAKE_SPEAK:'SPEAK',BT_SNAKE_CANCEL_SPEECH:'CANCEL_SPEECH',
      BT_SNAKE_MENU:'REQUEST_MENU',BT_SNAKE_STATE:'STATE'};
    if (types[event.type]) {
      const {type, ...payload} = event;
      emit(types[type], null, payload);
    }
  })) throw new Error('ENGINE_ALREADY_BOUND');
  hostWindow.BTSnakeLegacyDispose?.();
  hostWindow.addEventListener('message', receive);
  send({protocol:PROTOCOL,engineId:ENGINE_ID,type:'READY',payload:{buildId:policy.buildId}});
  return Object.freeze({dispose:cleanup});
}
