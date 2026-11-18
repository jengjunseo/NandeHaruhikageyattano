'use strict';
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[3]||'dist'),port=Number(process.argv[2])||4173,log=process.argv[4];
if(log){fs.mkdirSync(path.dirname(path.resolve(log)),{recursive:true});fs.writeFileSync(log,'');}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.json':'application/json; charset=utf-8'};
http.createServer((req,res)=>{
 let file,relative;try{relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+relative);if(file===root){file=path.join(root,'index.html');relative='/index.html';}}catch{res.writeHead(400).end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 fs.stat(file,(error,stat)=>{
  if(error||!stat.isFile()){res.writeHead(404).end();return;}
  let start=0,end=stat.size-1,status=200;const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range||'');
  if(match){if(!match[1]&&match[2])start=Math.max(0,stat.size-Number(match[2]));else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}if(!Number.isSafeInteger(start)||start<0||start>end){res.writeHead(416,{'Content-Range':'bytes */'+stat.size}).end();return;}status=206;}
  const length=end-start+1,headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':length,'Cache-Control':'no-store','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};if(status===206)headers['Content-Range']='bytes '+start+'-'+end+'/'+stat.size;
  res.writeHead(status,headers);res.on('finish',()=>{if(log)fs.appendFileSync(log,JSON.stringify({path:relative,status,method:req.method,bytes:req.method==='HEAD'?0:length})+'\n');});
  if(req.method==='HEAD'){res.end();return;}const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 });
}).listen(port,'127.0.0.1',()=>console.log('Local URL: http://127.0.0.1:'+port+'/'));
