import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),out=new URL('../dist-preview/',import.meta.url);
const files=['engine/snake.js','engine/session.mjs','engine/snake.css'];
const template=await readFile(new URL('snake-game.html',root),'utf8');
const html=template.replace('<script src="./engine/adapter.js"></script>','<script type="module" src="./engine/staging-bootstrap.mjs"></script>');
const bootstrap=`import {attachSnakeSession} from './session.mjs';
import {BUILD_ID} from './build.mjs';
const allowed=origin=>{try{const host=new URL(origin).hostname;return origin==='https://'+host&&(host==='bt-vocabulary-platform-staging.pages.dev'||host.endsWith('.bt-vocabulary-platform-staging.pages.dev'));}catch{return false;}};
let shellOrigin;
try{shellOrigin=new URL(document.referrer).origin;}catch{}
if(!allowed(shellOrigin)||window.parent===window){document.getElementById('game').textContent='Open this engine through the staging launcher.';}
else attachSnakeSession({engine:window.BTSnake,policy:{shellOrigin,engineOrigin:location.origin,buildId:BUILD_ID}});
`;
const contents=await Promise.all(files.map(f=>readFile(new URL(f,root),'utf8')));
const buildId=createHash('sha1').update([html,bootstrap,...contents].join('\n')).digest('hex');
await rm(out,{recursive:true,force:true});await mkdir(new URL('engine/',out),{recursive:true});
for(let i=0;i<files.length;i++)await writeFile(new URL(files[i],out),contents[i]);
await writeFile(new URL('snake-game.html',out),html);
await writeFile(new URL('index.html',out),html);
await writeFile(new URL('engine/staging-bootstrap.mjs',out),bootstrap);
await writeFile(new URL('engine/build.mjs',out),`export const BUILD_ID=${JSON.stringify(buildId)};\n`);
await writeFile(new URL('version.json',out),JSON.stringify({environment:'staging',buildId,sourceCommit:process.env.CF_PAGES_COMMIT_SHA||process.env.GITHUB_SHA||'local-unreleased'},null,2)+'\n');
await writeFile(new URL('_headers',out),`/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors https://bt-vocabulary-platform-staging.pages.dev https://*.bt-vocabulary-platform-staging.pages.dev
  Referrer-Policy: strict-origin
  X-Content-Type-Options: nosniff
  Cache-Control: no-store
`);
console.log('Staging engine artifact',buildId);
