const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'../assets'),elements=new Map();
const $=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',addEventListener(t,fn){this[t]=fn;}});return elements.get(id);};
let rect={left:10,top:20,width:400,height:200};const drawn=[];
const ctx={$,console,Math,Number,strokes:[],currentStroke:null,uploading:false,canvasPaint415:0,canvas:{style:{},insertAdjacentHTML(){},getBoundingClientRect(){return rect;}},document:{activeElement:null,querySelector(){return $('meta');},querySelectorAll(){return [];}},getComputedStyle(){return {getPropertyValue(){return '#ccc';}};},context:new Proxy({},{get(t,k){return (...a)=>drawn.push([k,...a]);},set(t,k,v){t[k]=v;return true;}}),saveDrawing(){},renderCanvas(){ctx.paintCanvas415();},async run(fn){try{await fn();}catch(e){ctx.error=e.message;}},confirm(){return true;}};
ctx.patterns412={insertAdjacentHTML(){}};ctx.patternView412={insertAdjacentHTML(){}};ctx.setTab=name=>{ctx.activeTab=name;};ctx.window=ctx;vm.createContext(ctx);const app=fs.readFileSync(path.join(root,'app.js'),'utf8');vm.runInContext(app.slice(app.indexOf('function simplify('),app.indexOf("$('undoDrawing')")),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'drawing-scale.js'),'utf8'),ctx);
const scale=vm.runInContext('drawingScale',ctx);const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
(async()=>{
 assert.equal(ctx.canvas.width/ctx.canvas.height,2);assert.equal(ctx.canvas.style.aspectRatio,'2 / 1');
 for(const p of [{x:6,y:9},{x:72,y:36},{x:39,y:22.5},{x:12.3,y:24.7}]){const q=scale.project(p),r=scale.unproject(q.x,q.y);near(r.x,p.x);near(r.y,p.y);}
 await $('drawingSquare10').click();assert.match($('drawingSize').textContent,/10.0 × 10.0/);
 let sent=ctx.flattenDrawing();assert.equal(Math.max(...sent.map(p=>p.x))-Math.min(...sent.map(p=>p.x)),1000);assert.equal(Math.max(...sent.map(p=>p.y))-Math.min(...sent.map(p=>p.y)),1000);
 const p=ctx.strokes[0].map(p=>scale.project(p));near(p[1].x-p[0].x,150);near(p[1].y-p[2].y,150);
 for(const width of [320,393,800,1280]){rect={left:10,top:20,width,height:width/2};const px=scale.project({x:34,y:17.5});const got=ctx.pointer({clientX:10+px.x/1200*width,clientY:20+px.y/600*(width/2)});near(got.x,34);near(got.y,17.5);}
 $('drawingWidthMm').value='20';await $('drawingWidthMm').change();near(scale.bounds(ctx.strokes).width,20);near(scale.bounds(ctx.strokes).height,20);
 $('drawingHeightMm').value='30';await $('drawingHeightMm').change();assert.match(ctx.error,/超出/);near(scale.bounds(ctx.strokes).height,20);assert.equal($('drawingHeightMm').value,'20.0');
 ctx.strokes=[[{x:10,y:12},{x:30,y:22}]];ctx.renderCanvas();$('drawingHeightMm').value='5';await $('drawingHeightMm').change();near(scale.bounds(ctx.strokes).width,10);near(scale.bounds(ctx.strokes).height,5);
 const original=JSON.stringify(ctx.strokes);ctx.renderCanvas();assert.equal(JSON.stringify(ctx.strokes),original); // preview never changes uploaded geometry
 const result={status:'passed',coverage:['80x40 board reference at 2:1','same 15 px/mm both axes','coordinate inverse','phone and tablet pointer transforms','10 mm square preview and firmware centi-mm match','locked aspect resizing','oversized request rejected and UI restored','render leaves coordinates unchanged'],physical_device_tested:false};console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;});
