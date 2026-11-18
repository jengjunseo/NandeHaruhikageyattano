'use strict';
// Portable deterministic static build. No credentials, runtime state or clock
// enter the artifact. The same script is shipped as scripts/build.cjs on GitHub.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),app=path.resolve(process.argv[2]||path.join(root,'app')),out=path.resolve(process.argv[3]||path.join(root,'dist'));
const allowed=[path.join(root,'dist'),path.join(root,'work','v53-build')];
if(!allowed.includes(out)||out===app||fs.lstatSync(out,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('Unapproved build output directory: '+out);
if(fs.existsSync(out)&&fs.realpathSync(out)!==out)throw Error('Build output must resolve inside the selected workspace: '+out);
console.log('Verified generated-output target: '+out);
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),read=file=>fs.readFileSync(path.join(app,file),'utf8').replace(/\r\n/g,'\n');
const images=JSON.parse(read('image-manifest.json')).images;
const versioned={};for(const row of Object.values(images)){versioned[row.url]=row.url+'?v='+row.sha256.slice(0,12);if(row.small)versioned[row.small]=row.small+'?v='+hash(fs.readFileSync(path.join(app,row.small))).slice(0,12);}
const versionURL=source=>versioned[source]||source;
let html=read('index.html');const scripts=[...html.matchAll(/<script src="([^"?]+\.js)"><\/script>/g)].map(m=>m[1]),styles=[...html.matchAll(/<link rel="stylesheet" href="([^"?]+\.css)">/g)].map(m=>m[1]);
assert(scripts.length>=30&&styles.length>=10);
let js=scripts.map(file=>file==='image-manifest.js'?"window.RingImageManifest="+JSON.stringify(Object.fromEntries(Object.entries(images).map(([key,row])=>[key,{...row,url:versionURL(row.url),...(row.small?{small:versionURL(row.small)}:{})}]))):read(file)).join('\n;\n');
const css=styles.map(file=>'/* '+file+' */\n'+read(file)).join('\n').replace(/url\((['"]?)(assets\/[^)'"\s]+)\1\)/g,(_all,_quote,url)=>'url("'+versionURL(url)+'")');
const id='v53-'+hash(js+css+JSON.stringify(images)).slice(0,16);js="'use strict';\nwindow.RingBuild="+JSON.stringify({version:53,id})+';\n'+js;
const jsName='game.'+hash(js).slice(0,12)+'.js',cssName='styles.'+hash(css).slice(0,12)+'.css';
fs.writeFileSync(path.join(out,jsName),js);fs.writeFileSync(path.join(out,cssName),css);
let firstJS=true,firstCSS=true;html=html.replace(/<script src="[^"?]+\.js"><\/script>/g,()=>{if(!firstJS)return '';firstJS=false;return '<script src="'+jsName+'" defer></script>';}).replace(/<link rel="stylesheet" href="[^"?]+\.css">/g,()=>{if(!firstCSS)return '';firstCSS=false;return '<link rel="stylesheet" href="'+cssName+'">';});
html=html.replace(/src="(assets\/[^"?]+)"/g,(_all,url)=>'src="'+versionURL(url)+'"');
html=html.replace('<meta charset="utf-8">','<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; media-src \'self\'; connect-src \'self\'; object-src \'none\'; base-uri \'self\'; form-action \'none\'">');
fs.writeFileSync(path.join(out,'index.html'),html);fs.cpSync(path.join(app,'assets'),path.join(out,'assets'),{recursive:true});
const first=['title-screen','cafe-v52','pico-taki-v52','pico-guests-v52','menu-atlas','furniture-v52','taki-chibi'].map(x=>'assets/'+x+'.png').concat(['taki','anon','tomori','soyo','rana'].map(x=>'assets/casual/'+x+'.png'));
const firstPlayImageBytes=first.reduce((n,key)=>n+images[key].bytes,0);assert(firstPlayImageBytes<5e6);
const files=[];function walk(dir=''){for(const e of fs.readdirSync(path.join(out,dir),{withFileTypes:true})){const name=(dir?dir+'/':'')+e.name;if(e.isDirectory())walk(name);else{const bytes=fs.readFileSync(path.join(out,name));files.push({path:name,bytes:bytes.length,sha256:hash(bytes)});}}}walk();
fs.writeFileSync(path.join(out,'build-manifest.json'),JSON.stringify({version:53,id,entry:jsName,styles:cssName,sourceScripts:scripts,sourceStyles:styles,firstPlayImageBytes,files},null,2)+'\n');
console.log(JSON.stringify({id,jsName,cssName,firstPlayImageBytes,files:files.length},null,2));
