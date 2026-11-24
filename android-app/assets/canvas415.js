'use strict';
// Preserve every sampled point; group drawing work into one paint per display frame.
// Simplification for transmission is unchanged and runs after the finger is lifted.
let canvasPaint415=0,canvasPaths415=new WeakMap(),canvasGrid415=null,canvasTheme415='';
function paintCanvas415(){
 canvasPaint415=0;
 const theme=document.documentElement.dataset.theme;
 if(!canvasGrid415||canvasTheme415!==theme){
  canvasTheme415=theme;
  const palette=getComputedStyle(canvas);
  const grid=document.createElement('canvas');grid.width=canvas.width;grid.height=canvas.height;
  const gc=grid.getContext('2d');gc.strokeStyle=palette.getPropertyValue('--canvas-grid').trim();gc.lineWidth=1;
  gc.beginPath();
  for(let x=0;x<=grid.width;x+=grid.width/22){gc.moveTo(x,0);gc.lineTo(x,grid.height);}
  for(let y=0;y<=grid.height;y+=grid.height/9){gc.moveTo(0,y);gc.lineTo(grid.width,y);}
  gc.stroke();canvasGrid415={grid,ink:palette.getPropertyValue('--canvas-ink').trim()};
 }
 context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(canvasGrid415.grid,0,0);
 context.lineWidth=12;context.lineCap='round';context.lineJoin='round';context.strokeStyle=canvasGrid415.ink;
 for(const stroke of strokes){
  if(!stroke.length)continue;
  let cached=canvasPaths415.get(stroke);
  if(!cached||cached.length>stroke.length){cached={path:new Path2D(),length:0};canvasPaths415.set(stroke,cached);}
  for(let i=cached.length;i<stroke.length;i++){
   const p=stroke[i],x=(p.x-6)/66*canvas.width,y=(36-p.y)/27*canvas.height;
   if(i===0)cached.path.moveTo(x,y);else cached.path.lineTo(x,y);
  }
  cached.length=stroke.length;context.stroke(cached.path);
 }
 const count=currentStroke?strokes.reduce((n,s)=>n+s.length,0):flattenDrawing().length;
 $('pointCount').textContent=count+(currentStroke?' 采样点':' 点');
}
renderCanvas=function(){
 if(currentStroke){if(!canvasPaint415)canvasPaint415=requestAnimationFrame(paintCanvas415);}
 else{cancelAnimationFrame(canvasPaint415);canvasPaths415=new WeakMap();paintCanvas415();}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(canvasPaint415);canvasPaint415=0;}});
renderCanvas();
