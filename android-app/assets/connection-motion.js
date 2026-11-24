'use strict';
// Presentation only: no Bluetooth commands, firmware writes or timing delays in the event chain.
(()=>{
 const duration=3000,clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const layer=document.createElement('section');layer.className='connection-motion';layer.id='connectionMotion';layer.hidden=true;
 layer.setAttribute('aria-label','蓝牙连接过渡');
 layer.innerHTML=window.LuluConnectionArt+'<div class="connection-copy" role="status"><h2 id="connectionMotionTitle"></h2><p id="connectionMotionCaption"></p></div><small class="connection-preview-label" hidden>动效预览 · 不连接设备</small><button type="button" class="connection-skip">跳过动画</button>';
 document.body.append(layer);delete window.LuluConnectionArt;
 const element=id=>layer.querySelector('#cm-'+id),skip=layer.querySelector('.connection-skip');
 const route=element('gestureRoute'),ink=element('ink'),pen=element('pen'),eraser=element('eraser'),crumbs=element('crumbs');
 const blocked=[document.querySelector('main'),document.querySelector('nav'),$('tabletSections')].filter(Boolean);
 let active=false,animations=[],deadline=0,epoch=0,wasConnected=ready,disconnectUntil=0,savedFocus=null,savedInert=[];
 let framesCache=null;
 const previousBack=window.handleAppBack;
 function align(){layer.style.setProperty('--connection-top',Math.max(0,document.querySelector('header').getBoundingClientRect().bottom)+'px');}
 function finish(){
  ++epoch;clearTimeout(deadline);for(const animation of animations)animation.cancel();animations=[];
  if(!active)return;active=false;layer.hidden=true;layer.style.opacity='';
  blocked.forEach((node,i)=>node.toggleAttribute('inert',savedInert[i]));
  if(layer.contains(document.activeElement)){
   const target=savedFocus?.isConnected&&!savedFocus.closest('[inert],[hidden]')?savedFocus:$('connectionButton');
   target?.focus({preventScroll:true});
  }
  layer.dispatchEvent(new CustomEvent('connection-motion-finished'));
 }
 function frames(){
  if(framesCache)return framesCache;
  const length=route.getTotalLength(),first=route.getPointAtLength(0),tool=[],draw=[],erase=[],dust=[];
  // Sample the approved SVG gesture once; WebView interpolates all subsequent frames.
  for(let i=0;i<=90;i++){
   const t=i*duration/90,pop=smooth(t/220),motion=smooth((t-350)/1250),exit=smooth((t-1600)/260);
   let point=route.getPointAtLength(motion*length);
   if(t<350){const enter=smooth((t-120)/230);point={x:220+(first.x-220)*enter,y:210+(first.y-210)*enter};}
   const scale=pop*(1+.1*Math.sin(pop*Math.PI));
   tool.push({offset:i/90,opacity:pop*(1-exit),base:`translate(${point.x}px,${point.y}px)`,scale,motion});
   const appear=smooth((t-330)/1150),removed=smooth((t-330)/1250),fade=smooth((t-1900)/650);
   draw.push({offset:i/90,opacity:appear*(1-fade),filter:`blur(${(1-appear)*3+fade*5}px)`,transform:`translateY(${-fade*8}px) scale(${.96+.04*appear})`});
   erase.push({offset:i/90,opacity:1-removed,filter:`blur(${removed*6}px)`,transform:`translateY(${-removed*8}px) scale(${1+.025*removed})`});
   dust.push({offset:i/90,opacity:Math.sin(motion*Math.PI)*.5*(1-exit),transform:`translate(${point.x-12}px,${point.y+8}px)`});
  }
  return framesCache={tool,draw,erase,dust};
 }
 function animate(node,keyframes){const a=node.animate(keyframes,{duration,easing:'linear',fill:'both'});a.finished.catch(()=>{});animations.push(a);}
 function start(mode,preview=false){
  finish();
  if(document.hidden||motionReduced418()||typeof layer.animate!=='function')return false;
  active=true;const token=epoch;align();savedFocus=document.activeElement;savedInert=blocked.map(n=>n.hasAttribute('inert'));
  blocked.forEach(n=>n.setAttribute('inert',''));layer.hidden=false;layer.dataset.mode=mode;layer.dataset.preview=String(preview);
  layer.querySelector('.connection-preview-label').hidden=!preview;
  $('connectionMotionTitle').textContent=mode==='connect'?'与你的小噜相遇':'轻轻收起，下次再见';
  $('connectionMotionCaption').textContent=mode==='connect'?'轻轻一挥，小噜就在。':'连接暂歇，时间继续。';
  skip.textContent=preview?'结束预览':'跳过动画';skip.focus({preventScroll:true});
  try{
   const f=frames(),connected=mode==='connect';
   pen.style.opacity='0';eraser.style.opacity='0';crumbs.style.opacity='0';
   animate(ink,connected?f.draw:f.erase);
   animate(connected?pen:eraser,f.tool.map(k=>({offset:k.offset,opacity:k.opacity,transform:`${k.base} rotate(${Math.sin(k.motion*Math.PI)*(connected?-16:12)}deg) scale(${k.scale})`})));
   if(!connected)animate(crumbs,f.dust);
   animate(layer,[{offset:0,opacity:1},{offset:2310/duration,opacity:1},{offset:1,opacity:0}]);
   // Independent deadline also clears the surface if Android throttles animation callbacks.
   deadline=setTimeout(()=>{if(token===epoch)finish();},duration);
   animations[animations.length-1].finished.then(()=>{if(token===epoch)finish();}).catch(()=>{});
  }catch(error){finish();return false;}
  return true;
 }
 skip.addEventListener('click',finish);
 window.handleAppBack=()=>{if(active){finish();return true;}return previousBack?.()||false;};
 document.addEventListener('keydown',event=>{if(active&&event.key==='Escape'){event.preventDefault();finish();}});
 // Header controls, including STOP, remain immediately available during the scene.
 document.addEventListener('click',event=>{if(active&&event.target.closest('header'))finish();},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();});
 window.addEventListener('pagehide',finish);window.addEventListener('resize',()=>{if(active)align();});
 $('motionPreference').addEventListener('change',()=>{if(motionReduced418())finish();});
 if(reducedMotion413.addEventListener)reducedMotion413.addEventListener('change',()=>{if(motionReduced418())finish();});
 window.connectionMotion={expectDisconnect(){disconnectUntil=wasConnected?performance.now()+5000:0;}};
 const baseEvent=window.onNativeEvent;
 window.onNativeEvent=event=>{
  let showHome=false;
  if(event.type==='connection'){
   const next=event.state==='ready',previous=wasConnected;
   const intentional=event.state==='disconnected'&&previous&&disconnectUntil>performance.now();
   const upgrading=typeof otaBusy!=='undefined'&&(otaBusy||otaAccepted||otaRecoveryPending);
   if(next&&!previous){finish();showHome=!upgrading;if(showHome)start('connect');}
   else if(!next&&(previous||event.state==='connecting')){finish();showHome=intentional&&!upgrading;if(showHome)start('disconnect');}
   wasConnected=next;disconnectUntil=0;
  }else if(event.type==='error')finish();
  // Start the opaque scene before the existing handlers reveal their new route.
  // Do not await GET, version checks or OTA queries before forwarding the event.
  const pending=baseEvent(event);
  if(showHome){setTab('control');renderDevice412();}
  return pending;
 };
 const card=document.createElement('section');card.className='connection-motion-setting';
 card.innerHTML='<h3>连接时的小仪式</h3><p>3 秒笔绘与橡皮擦过渡。预览不会连接设备，也不会向时钟发送指令。</p><div class="connection-preview-actions"><button type="button" data-connection-preview="connect">预览连接</button><button type="button" data-connection-preview="disconnect">预览断开</button></div>';
 $('panel-appearance').append(card);
 card.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
  if(motionReduced418()){toast('请先将界面动画设为“完整动效”再预览');return;}
  if(uploading||otaBusy){toast('当前正在传输，请完成后再预览');return;}
  start(button.dataset.connectionPreview,true);
 }));
})();
