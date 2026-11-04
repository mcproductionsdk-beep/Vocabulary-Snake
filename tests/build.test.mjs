import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
test('staging artifact excludes tests, legacy bridge and production service access',()=>{
 execFileSync(process.execPath,['scripts/build-preview.mjs'],{cwd:root});
 const out=resolve(root,'dist-preview');
 const files=readdirSync(out,{recursive:true}).filter(p=>!p.endsWith('/'));
 assert.equal(files.some(p=>/tests|fixtures|reference|docs|adapter\.js/.test(p)),false);
 const headers=readFileSync(resolve(out,'_headers'),'utf8');assert.match(headers,/connect-src 'none'/);assert.match(headers,/frame-ancestors https:\/\/bt-vocabulary-platform-staging\.pages\.dev/);
 for(const p of ['index.html','snake-game.html','engine/staging-bootstrap.mjs','engine/build.mjs']){
  const text=readFileSync(resolve(out,p),'utf8');assert.doesNotMatch(text,/boringteacher\.com|vocabulary-api\.mcproductionsdk|workers\.dev|<script>[^<]/);
 }
 const meta=JSON.parse(readFileSync(resolve(out,'version.json'),'utf8'));assert.equal(meta.environment,'staging');assert.match(meta.buildId,/^[a-f0-9]{40}$/);
});
