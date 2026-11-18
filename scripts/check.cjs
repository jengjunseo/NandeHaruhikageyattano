'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawn}=require('child_process');
const root=path.resolve(__dirname,'..');fs.mkdirSync(path.join(root,'.cache/v53'),{recursive:true});
const syntax=fs.readdirSync(path.join(root,'app')).filter(x=>x.endsWith('.js')).map(x=>({name:'syntax '+x,args:['--check',path.join(root,'app',x)]}));
const checks=[...syntax,...require('../tests/checks.json').map(x=>({name:x,args:[path.join(root,'tests',x)]}))];
let cursor=0,failed=0;
function run(check){return new Promise(resolve=>{const child=spawn(process.execPath,check.args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);child.on('error',e=>resolve({code:1,output:String(e)}));child.on('close',code=>resolve({code,output}))})}
async function worker(){while(cursor<checks.length){const check=checks[cursor++],result=await run(check);if(result.code){failed++;console.error('FAIL '+check.name+'\n'+result.output.trim())}else console.log('PASS '+check.name)}}
(async()=>{await Promise.all(Array.from({length:4},worker));console.log(checks.length+' checks, '+failed+' failures.');if(failed)process.exitCode=1})().catch(e=>{console.error(e);process.exitCode=1});
