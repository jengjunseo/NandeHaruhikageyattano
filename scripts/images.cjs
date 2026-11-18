'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),sharp=require('sharp');
const root=path.resolve('app'),target=path.join(root,'assets/optimized');fs.mkdirSync(target,{recursive:true});
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()&&e.name!=='optimized'?walk(path.join(dir,e.name)):e.isFile()&&e.name.endsWith('.png')?[path.join(dir,e.name)]:[])}
(async()=>{const manifest={version:53,tool:'sharp 0.34.5',images:{}};for(const file of walk(path.join(root,'assets'))){
 const relative=path.relative(root,file).replaceAll('\\','/'),name=path.relative(path.join(root,'assets'),file).replaceAll('\\','/').replace(/\.png$/,'.webp'),meta=await sharp(file).metadata();
 const atlas=relative.includes('/casual/'),sd=/pico-|furniture/.test(name),background=/cafe|title-screen|vn-stage|vn-rehearsal/.test(name);
 const width=atlas?1280:sd?Math.min(768,meta.width):background?1280:Math.min(600,meta.width);
 const output=path.join(target,name);fs.mkdirSync(path.dirname(output),{recursive:true});
 await sharp(file).resize({width,withoutEnlargement:true}).webp({quality:88,alphaQuality:100,effort:5}).toFile(output);
 const final=await sharp(output).metadata();manifest.images[relative]={url:'assets/optimized/'+name,sourceBytes:fs.statSync(file).size,bytes:fs.statSync(output).size,width:final.width,height:final.height,sourceWidth:meta.width,sourceHeight:meta.height,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')};
 if(background){const small=output.replace('.webp','-small.webp');await sharp(file).resize({width:960,withoutEnlargement:true}).webp({quality:86,alphaQuality:100,effort:5}).toFile(small);manifest.images[relative].small='assets/optimized/'+name.replace('.webp','-small.webp');manifest.images[relative].smallBytes=fs.statSync(small).size;}
 }
 fs.writeFileSync(path.join(root,'image-manifest.json'),JSON.stringify(manifest,null,2));
 fs.writeFileSync(path.join(root,'image-manifest.js'),"'use strict';\nwindow.RingImageManifest="+JSON.stringify(manifest.images)+";\n");
 const values=Object.values(manifest.images);console.log(JSON.stringify({images:values.length,before:values.reduce((n,x)=>n+x.sourceBytes,0),after:values.reduce((n,x)=>n+x.bytes,0)},null,2));
})();
