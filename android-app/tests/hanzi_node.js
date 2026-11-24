const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.join(__dirname,'../assets'),ctx={};ctx.window=ctx;vm.createContext(ctx);
for(const file of ['hanzi-medians.js','hanzi-text.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
vm.runInContext('let strokes=[];'+app.slice(app.indexOf('function simplify('),app.indexOf("$('undoDrawing')")),ctx);
const fallback=()=>{throw Error('Chinese must never use skeleton fallback');};
const samples=['你好世界','口','十','女','永','中国','噜噜绘时钟','龍'];
for(const text of samples){
 const out=ctx.HanziText.generate(text,fallback);assert(!out.error);
 const originals=[...text].flatMap(c=>ctx.HanziMedians[c]);assert.equal(out.strokes.length,originals.length);
 for(let i=0;i<originals.length;i++){
  const s=out.strokes[i],o=originals[i];assert.equal(s.length,o.length);
  for(let j=1;j<s.length;j++){assert.equal(Math.sign(s[j].x-s[j-1].x),Math.sign(o[j][0]-o[j-1][0]));assert.equal(Math.sign(s[j].y-s[j-1].y),Math.sign(o[j][1]-o[j-1][1]));}
  for(const p of s)assert(p.x>=7-1e-8&&p.x<=71+1e-8&&p.y>=9-1e-8&&p.y<=33+1e-8);
 }
 ctx.input=out.strokes;vm.runInContext('strokes=input.map(s=>simplify(s,.12));',ctx);
 const sent=ctx.flattenDrawing();assert.equal(sent.filter(p=>p.lit===0).length,originals.length);assert(sent.length<2048);
}
const mouth=ctx.HanziText.generate('口',fallback).strokes;assert.equal(mouth.length,3);assert(mouth[1].length>=3); // horizontal-turn is one stroke
const cross=ctx.HanziText.generate('十',fallback).strokes;assert.equal(cross.length,2);assert(cross[0][0].x<cross[0].at(-1).x);assert(cross[1][0].y>cross[1].at(-1).y);
let called=0;const fake=t=>{called++;return {strokes:[[{x:10,y:12},{x:16,y:30}]]};};
assert(!ctx.HanziText.generate('中A文',fake).error);assert.equal(called,1);
assert(ctx.HanziText.generate('\u{20000}',fallback).error.includes('暂未收录'));
assert(ctx.HanziText.generate('中'.repeat(17),fallback).error);
assert(ctx.HanziText.generate('',fallback).error);
for(const [c,ss] of Object.entries(ctx.HanziMedians)){assert(ss.length>0);for(const s of ss){assert(s.length>=2,c);for(const p of s)assert(p.length===2&&p.every(Number.isFinite),c);}}
assert(fs.readFileSync(path.join(root,'canvas415.js'),'utf8').includes('context.lineWidth=12;'));
const result={status:'passed',characters:Object.keys(ctx.HanziMedians).length,samples,checks:['per-stroke count/order/direction','horizontal-turn remains continuous','cross writes horizontal then vertical','full generation and transmission retains pen-up boundaries','mixed Latin fallback only','missing Han fails explicitly','all data structurally valid','active canvas width 12px'],physical_device_tested:false};
console.log(JSON.stringify(result));
