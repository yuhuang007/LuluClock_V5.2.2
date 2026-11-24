'use strict';
// Physical scale: 15 backing pixels per commanded millimetre in BOTH axes.
// The board outline is a centred size reference, not a measured mounting origin.
const drawingScale={
 width:80,height:40,ppm:15,cx:39,cy:22.5,
 project(p){return {x:(p.x-this.cx+40)*this.ppm,y:(20-p.y+this.cy)*this.ppm};},
 unproject(x,y){return {x:x/this.ppm-40+this.cx,y:20-y/this.ppm+this.cy};},
 bounds(paths){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const s of paths)for(const p of s){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}return Number.isFinite(minX)?{minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY}:null;},
 resize(paths,axis,size){
  const b=this.bounds(paths);if(!b||!Number.isFinite(size)||size<=0)throw Error('请输入大于零的尺寸');
  const old=axis==='width'?b.width:b.height;if(old<.01)throw Error('这条线在该方向没有长度，请调整另一方向');
  const ratio=size/old,cx=(b.minX+b.maxX)/2,cy=(b.minY+b.maxY)/2;
  const next=paths.map(s=>s.map(p=>({x:cx+(p.x-cx)*ratio,y:cy+(p.y-cy)*ratio})));
  if(next.some(s=>s.some(p=>p.x<6||p.x>72||p.y<9||p.y>36)))throw Error('尺寸超出当前固件绘制范围，请先居中或缩小');
  return next;
 }
};
canvas.width=1200;canvas.height=600;canvas.style.aspectRatio='2 / 1';
document.querySelector('.canvas-meta>span').textContent='板面参考 · 80 × 40 mm';
canvas.insertAdjacentHTML('afterend',`<div class="drawing-dimensions">
 <p id="drawingSize" class="hint" role="status"></p>
 <details class="drawing-size-options"><summary>尺寸设置</summary>
 <div class="drawing-size-fields"><label>宽 <input id="drawingWidthMm" type="number" min="0.1" max="66" step="0.1"> mm</label><label>高 <input id="drawingHeightMm" type="number" min="0.1" max="27" step="0.1"> mm</label></div>
 <p class="hint">锁定比例缩放。虚线内可绘 66 × 27 mm；尺寸不含灯头光斑。</p>
 </details></div>`);
const patternSizes=[['方框','54 × 21 mm'],['十字','48 × 23 mm'],['椭圆','48 × 20 mm'],['网格','48 × 20 mm'],['爱心','约 48 × 18.8 mm']];
for(const button of document.querySelectorAll('[data-pattern]')){
 const spec=patternSizes[Number(button.dataset.pattern)];if(!spec)continue;
 const label=button.querySelector('span');if(label)label.textContent=spec[0];
 const size=document.createElement('small');size.className='pattern-size';size.textContent=spec[1];button.append(size);
 button.setAttribute('aria-label',spec[0]+'，'+spec[1]+'，直接绘制');
}
patterns412.insertAdjacentHTML('beforeend',`<button id="drawingSquare10" class="pattern-calibration" aria-label="校验方框，10 × 10 mm，载入画布"><span class="pattern-square-icon" aria-hidden="true">□</span><span>校验方框</span><small class="pattern-size">10 × 10 mm</small><small class="pattern-action">载入画布</small></button>`);
patternView412.insertAdjacentHTML('beforeend','<p class="hint">尺寸为宽 × 高，不含灯头光斑。常规图形点击即绘制；校验方框先载入画布，再点发送。</p>');
pointer=function(event){const rect=canvas.getBoundingClientRect();const p=drawingScale.unproject((event.clientX-rect.left)/rect.width*canvas.width,(event.clientY-rect.top)/rect.height*canvas.height);return {x:Math.max(6,Math.min(72,p.x)),y:Math.max(9,Math.min(36,p.y))};};
paintCanvas415=function(){
 canvasPaint415=0;
 const palette=getComputedStyle(canvas),ink=palette.getPropertyValue('--canvas-ink').trim()||'#825528',grid=palette.getPropertyValue('--canvas-grid').trim()||'#e3e9da';
 context.clearRect(0,0,canvas.width,canvas.height);
 context.strokeStyle=grid;context.lineWidth=1;context.beginPath();
 for(let x=0;x<=1200;x+=75){context.moveTo(x,0);context.lineTo(x,600);}
 for(let y=0;y<=600;y+=75){context.moveTo(0,y);context.lineTo(1200,y);}context.stroke();
 context.save();context.fillStyle=ink;context.globalAlpha=.055;
 context.fillRect(0,0,1200,97.5);context.fillRect(0,502.5,1200,97.5);context.fillRect(0,97.5,105,405);context.fillRect(1095,97.5,105,405);context.restore();
 context.save();context.strokeStyle=ink;context.globalAlpha=.45;context.lineWidth=2;context.setLineDash([9,9]);context.strokeRect(105,97.5,990,405);context.restore();
 context.strokeStyle=ink;context.lineWidth=12;context.lineCap='round';context.lineJoin='round';
 for(const stroke of strokes){if(!stroke.length)continue;context.beginPath();stroke.forEach((p,i)=>{const v=drawingScale.project(p);if(i)context.lineTo(v.x,v.y);else context.moveTo(v.x,v.y);});context.stroke();}
 $('pointCount').textContent=(currentStroke?strokes.reduce((n,s)=>n+s.length,0):flattenDrawing().length)+' 点';
 const b=drawingScale.bounds(strokes);
 $('drawingSize').textContent=b?`图案 ${b.width.toFixed(1)} × ${b.height.toFixed(1)} mm`:'每格 5 mm';
 for(const [id,key] of [['drawingWidthMm','width'],['drawingHeightMm','height']]){const input=$(id);input.disabled=!b||uploading;if(document.activeElement!==input)input.value=b?b[key].toFixed(1):'';}
};
for(const [id,axis] of [['drawingWidthMm','width'],['drawingHeightMm','height']])$(id).addEventListener('change',()=>run(async()=>{try{if(uploading)throw Error('上传中不能编辑');strokes=drawingScale.resize(strokes,axis,Number($(id).value));saveDrawing();}finally{const b=drawingScale.bounds(strokes);$(id).value=b?b[axis].toFixed(1):'';renderCanvas();}}));
$('drawingSquare10').addEventListener('click',()=>run(async()=>{if(uploading)throw Error('上传中不能编辑');if(strokes.length&&!confirm('用 10 × 10 mm 校验方框替换当前画布？'))return;strokes=[[{x:34,y:17.5},{x:44,y:17.5},{x:44,y:27.5},{x:34,y:27.5},{x:34,y:17.5}]];saveDrawing();renderCanvas();setTab('draw');}));
renderCanvas();
