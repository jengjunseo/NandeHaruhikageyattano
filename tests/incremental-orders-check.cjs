const fs=require('fs'),vm=require('vm'),assert=require('assert');
const files=['final-stories','concert-arc','followup-stories','endings','live-stories','regular-stories','seasonal-stories','cameos','cafe-episodes','main-arc','episodes','choices','stories','comedy-stories','game'];
const src=files.map(n=>fs.readFileSync('dist/'+n+'.js','utf8')).join('\n');const els={};
const el=x=>els[x]||(els[x]={innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return []}});
const doc={querySelector:el,querySelectorAll:()=>[]};const c={console,Math,JSON,localStorage:{getItem:()=>null,setItem(){}},document:doc,window:{},setInterval(){},setTimeout(){return 1},clearTimeout(){}};
vm.createContext(c);vm.runInContext(src+';globalThis.api={s:()=>state,update:updateOrderBoard}',c);const a=c.api,s=a.s();
const grid={children:[],querySelectorAll(){return this.children},appendChild(card){this.children.push(card);card.parent=this}};
class Card{
 constructor(){this.dataset={};this.className='';this._html='';this.button=null}
 set innerHTML(value){this._html=value;const m=value.match(/data-(make|serve)="(\d+)"/);this.button=m?{dataset:{[m[1]]:m[2]},textContent:'',disabled:false}:null}
 get innerHTML(){return this._html}
 querySelectorAll(selector){return this.button&&((selector==='[data-make]'&&this.button.dataset.make)||(selector==='[data-serve]'&&this.button.dataset.serve))?[this.button]:[]}
 querySelector(selector){return selector==='[data-make],[data-serve]'?this.button:null}
 remove(){this.parent.children=this.parent.children.filter(c=>c!==this)}
}
doc.createElement=()=>new Card();const empty={hidden:false,textContent:''};
const panel={querySelector(x){return x==='.order-grid'?grid:x==='.order-empty'?empty:null}};
const order=(id,menu='coffee')=>({id,menu,status:'waiting',patience:20,maxPatience:26,price:480});
Object.assign(s,{phase:'open',customers:[order(1)]});assert(a.update(panel));const card=grid.children[0],button=card.button;assert.equal(typeof button.onclick,'function');
s.customers.push(order(2,'cake'));a.update(panel);assert.strictEqual(grid.children[0],card);assert.strictEqual(card.button,button,'arrival must not replace a different order button');
s.customers[1].status='making';a.update(panel);assert.strictEqual(card.button,button,'another order changing state must not replace the button');
s.workers.taki={id:2,kind:'make',remaining:3};a.update(panel);assert.strictEqual(card.button,button);assert(button.disabled,'other actions disable while Taki is busy');
s.workers.taki=null;s.stock.beans=0;a.update(panel);assert.strictEqual(card.button,button);assert(button.disabled);assert.equal(button.textContent,'재료 부족');
s.stock.beans=1;a.update(panel);assert(!button.disabled);assert.equal(button.textContent,'직접 제조');
s.customers=s.customers.filter(x=>x.id===1);a.update(panel);assert.equal(grid.children.length,1);assert.strictEqual(grid.children[0],card);
s.customers=[];a.update(panel);assert.equal(grid.children.length,0);assert.equal(empty.hidden,false);
console.log('PASS: unrelated arrivals/status changes preserve the order button; availability and removal update in place');

