'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {version,id}=JSON.parse(fs.readFileSync('dist/build-manifest.json','utf8'));
const snapshot=JSON.parse(fs.readFileSync('backup-v'+version+'.json','utf8'));
assert.equal(snapshot.buildId,id);
for(const file of snapshot.files){
  const bytes=fs.readFileSync(file.path);
  assert.equal(bytes.length,file.bytes,file.path);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);
}
console.log('PASS preserved v'+version+' snapshot '+snapshot.files.length+' files');
