'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),dist=path.resolve(process.argv[2]||path.join(root,'dist')),m=JSON.parse(fs.readFileSync(path.join(dist,'build-manifest.json'),'utf8'));
for(const file of m.files){const target=path.resolve(dist,file.path);assert(target.startsWith(dist+path.sep));const bytes=fs.readFileSync(target);assert.equal(bytes.length,file.bytes,file.path);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);}
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(/^(https?:|data:|blob:)/.test(match[1]))continue;assert(fs.existsSync(path.join(dist,match[1].split('?')[0])),match[1]);}
assert.equal([...html.matchAll(/<script src=/g)].length,1);assert.equal([...html.matchAll(/rel="stylesheet"/g)].length,1);assert(html.includes('Content-Security-Policy'));assert(m.firstPlayImageBytes<5e6);console.log('PASS reproducible release '+m.id+': '+m.files.length+' hashed files, linked entry/style, CSP and '+m.firstPlayImageBytes+' first-play image bytes.');
