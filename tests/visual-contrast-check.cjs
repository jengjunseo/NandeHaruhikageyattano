
const assert=require('node:assert/strict');
const pairs=[
 ['본문','#263841','#faf4e8'],['보조 문구','#655e53','#faf4e8'],
 ['피로','#574f43','#ede4d2'],['날씨·시계','#f6efdf','#203d4c'],
 ['현재 업무','#fff2dd','#223b46'],['VN 본문','#fff3dc','#172b36'],
 ['VN 이름표','#e5c58a','#172b36'],['주문 상태','#4b514b','#fffbf2']
];
function luminance(hex){const c=hex.slice(1).match(/../g).map(s=>parseInt(s,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]}
const ratios=pairs.map(([label,a,b])=>{const [hi,lo]=[luminance(a),luminance(b)].sort((a,b)=>b-a),ratio=(hi+.05)/(lo+.05);assert(ratio>=4.5,label+': '+ratio);return {label,foreground:a,background:b,ratio:Math.round(ratio*100)/100}});
require('fs').writeFileSync('tests/visual-contrast.json',JSON.stringify(ratios,null,2));
console.log('PASS contrast palette: '+ratios.map(x=>x.label+' '+x.ratio+':1').join(', ')+'. Solid colour pairs only; complete screen-reader and image compositing audit is separate.');

