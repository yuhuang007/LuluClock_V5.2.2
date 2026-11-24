'use strict';
// Shared motion and responsive shell; current release information is shown below.
document.body.classList.add('app414','app415');
document.title='噜噜绘时钟';
const logo415='<img src="brand-mark.svg" alt="" width="40" height="40" draggable="false">';
brand413.querySelector('.brand-mark').innerHTML=logo415;
brand413.querySelector('strong').textContent='噜噜绘时钟';
brand413.querySelector('small').textContent='让时间留下痕迹';
document.querySelector('.device-art').innerHTML=device413;
home412.querySelector('.device-card-info>small').textContent='我的设备';
home412.querySelector('.device-card h1').textContent='噜噜绘时钟';
const deviceStatus415=document.createElement('div');deviceStatus415.className='device-status';
$('homeConnection').before(deviceStatus415);deviceStatus415.append($('homeConnection'),$('homeVersion'));
home412.querySelector('.menu-group').classList.add('home-connections');
homeHero412.querySelector('.eyebrow').textContent='此刻';
homeHero412.querySelector('.hero-citrus').remove();
homeHero412.insertAdjacentHTML('beforeend','<div class="hero-orbit" aria-hidden="true"><svg viewBox="0 0 120 120"><circle class="orbit-ring" cx="60" cy="60" r="43"/><path class="orbit-hand" d="M60 34v26l19 12"/><circle class="orbit-center" cx="60" cy="60" r="3"/><circle class="orbit-satellite" cx="96" cy="36" r="7"/><path class="orbit-leaf" d="M96 29q-1-9 8-9 0 7-8 9"/></svg></div>');
document.querySelector('footer').remove();
aboutLogo413.innerHTML=logo415;
aboutView412.querySelector('.about-card h2').textContent='噜噜绘时钟';
aboutView412.querySelector('.about-card>p').textContent='App 5.2.2';
document.querySelectorAll('[data-menu-route=about]').forEach(e=>e.textContent='版本与设备信息');

// Build responsive groups once. Routes never move the live controls or canvas.
const homeTime415=document.createElement('div');homeTime415.className='home-time-area';
homeHero412.before(homeTime415);homeTime415.append(homeHero412,$('taskCard'));
const homeActions415=document.createElement('div');homeActions415.className='home-action-area';
home412.querySelector('.section-title').before(homeActions415);
homeActions415.append(home412.querySelector('.section-title'),homeActions412,autoCard412);
const tabletSections415=document.createElement('aside');tabletSections415.id='tabletSections';
tabletSections415.setAttribute('aria-label','当前分区页面');
const tabletRoutes415={
 control:[['control','设备总览'],['environment','屏幕与环境']],
 draw:[['draw','自由绘图'],['text','文字创作'],['favorites','图案收藏'],['patterns','测试图形']],
 timer:[['timer','倒计时与专注']],
 settings:[['settings','设置总览'],['appearance','外观与主题'],['wifi','网络连接'],['update','固件更新'],['drawing-settings','绘制设置'],['sound','声音与提醒'],['keys','按键设置'],['plans','自动计划'],['chime','整点提醒'],['calibrate','机械校准'],['device-tools','设备工具'],['about','关于设备']]
};
for(const [section,items]of Object.entries(tabletRoutes415)){
 const list=document.createElement('div');list.dataset.section=section;
 const heading=document.createElement('p');heading.textContent={control:'我的时钟',draw:'创作空间',timer:'专注时间',settings:'设备与偏好'}[section];list.append(heading);
 for(const [route,label]of items){const button=document.createElement('button');button.textContent=label;button.dataset.route=route;button.addEventListener('click',()=>setTab(route));list.append(button);}
 tabletSections415.append(list);
}
document.body.append(tabletSections415);
function syncTablet415(){
 const parent=parent412(currentRoute412);
 document.body.dataset.route=currentRoute412;
 tabletSections415.querySelectorAll('[data-section]').forEach(e=>e.hidden=e.dataset.section!==parent);
 tabletSections415.querySelectorAll('button').forEach(b=>{if(b.dataset.route===currentRoute412)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 document.querySelectorAll('nav button').forEach(b=>{if(b.dataset.tab===parent)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
}
syncTablet415();

document.body.classList.add('app418');
// Eight evenly spaced teeth, centered on the 24 × 24 viewbox.
icons412.settings='<path d="M9.866 5.019 L10.402 2.940 L13.598 2.940 L14.134 5.019 L15.427 5.554 L17.277 4.464 L19.536 6.723 L18.446 8.573 L18.981 9.866 L21.060 10.402 L21.060 13.598 L18.981 14.134 L18.446 15.427 L19.536 17.277 L17.277 19.536 L15.427 18.446 L14.134 18.981 L13.598 21.060 L10.402 21.060 L9.866 18.981 L8.573 18.446 L6.723 19.536 L4.464 17.277 L5.554 15.427 L5.019 14.134 L2.940 13.598 L2.940 10.402 L5.019 9.866 L5.554 8.573 L4.464 6.723 L6.723 4.464 L8.573 5.554Z"/><circle cx="12" cy="12" r="3.1"/>';
document.querySelector('nav button[data-tab=settings]').innerHTML=icon412('settings')+'<span>设置</span>';
let motionPreference418='full';
try{motionPreference418=localStorage.getItem('lulu.motion')||'full';}catch(ignored){}
const motionReduced418=()=>motionPreference418==='off'||motionPreference418==='system'&&reducedMotion413.matches;
const motionCard418=document.querySelector('.motion-setting');
motionCard418.innerHTML='<label for="motionPreference"><strong>界面动画</strong><small>完整过渡，或按你的习惯调整</small></label><select id="motionPreference"><option value="full">完整动效</option><option value="system">跟随系统</option><option value="off">关闭动效</option></select>';
$('motionPreference').value=motionPreference418;
function motionState418(){document.documentElement.dataset.motion=document.body.dataset.motion=motionReduced418()?'off':'full';}
$('motionPreference').addEventListener('change',()=>{motionPreference418=$('motionPreference').value;try{localStorage.setItem('lulu.motion',motionPreference418);}catch(ignored){}motionState418();if(motionReduced418())settleMotion418();});
motionState418();

// Maintenance is always visible and has no collapse affordance.
const maintenance418=document.createElement('section');maintenance418.className='settings-maintenance';
maintenance418.setAttribute('aria-labelledby','maintenanceTitle');
maintenance418.innerHTML='<div class="maintenance-heading"><h2 id="maintenanceTitle">设备维护</h2><p>校准与调试工具</p></div>';
maintenance418.append(maintenanceGroup413);maintenance413.replaceWith(maintenance418);

// Keep the existing editing buttons and listeners, arranged as a directional pad.
const editGrid418=document.querySelector('.canvas-edit .edit-grid');
const directionPad418=document.createElement('div');directionPad418.className='direction-pad';directionPad418.setAttribute('role','group');directionPad418.setAttribute('aria-label','移动图案');
const zoom418=document.createElement('div');zoom418.className='zoom-controls';
for(const [key,label]of [['up','向上移动'],['left','向左移动'],['center','图案居中'],['right','向右移动'],['down','向下移动']]){
 const b=editGrid418.querySelector('[data-edit='+key+']');b.setAttribute('aria-label',label);b.title=label;
 b.innerHTML=key==='center'?svg413('<circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'):svg413('<path d="m6 14 6-6 6 6M12 8v11"/>');directionPad418.append(b);
}
for(const [key,label,icon]of [['smaller','缩小','M5 12h14'],['larger','放大','M5 12h14M12 5v14']]){
 const b=editGrid418.querySelector('[data-edit='+key+']');b.innerHTML=svg413('<path d="'+icon+'"/>')+'<span>'+label+'</span>';zoom418.append(b);
}
editGrid418.replaceChildren(directionPad418,zoom418);document.querySelector('.canvas-edit').open=true;

// Each route owns a persistent scroll viewport. Both old and new routes can be
// composited together; no live nodes are reparented during navigation.
const main418=document.querySelector('main'),pages418=new Map();
for(const panel of [...main418.children].filter(p=>p.classList.contains('panel')||p.id==='connectCard')){
 const page=document.createElement('div');page.className='route-page';page.dataset.page=panel.id==='connectCard'?'connect':panel.id.slice(6);
 panel.before(page);page.append(panel);pages418.set(page.dataset.page,page);
}
const visibleKey418=route=>route==='control'&&!ready?'connect':route;
let activePage418=null,routeEpoch418=0,routing418=false;
const routeAnimations418=new Set();
function resetRoute418(){
 ++routeEpoch418;for(const a of routeAnimations418)a.cancel();routeAnimations418.clear();
 for(const p of pages418.values()){p.classList.remove('is-leaving','is-animating');if(p!==activePage418){p.classList.remove('is-active');p.setAttribute('inert','');p.setAttribute('aria-hidden','true');}}
}
function activatePage418(page){
 activePage418=page;
 for(const p of pages418.values()){p.classList.toggle('is-active',p===page);p.toggleAttribute('inert',p!==page);if(p===page)p.removeAttribute('aria-hidden');else p.setAttribute('aria-hidden','true');}
}
activatePage418(pages418.get(visibleKey418(currentRoute412)));
const renderBefore418=renderDevice412;let deviceFrame418=0;
function presentDevice418(){deviceFrame418=0;renderBefore418();if(typeof renderPolicyState==='function')renderPolicyState();if(!routing418&&pages418.get(visibleKey418(currentRoute412))!==activePage418){resetRoute418();activatePage418(pages418.get(visibleKey418(currentRoute412)));}}
// Protocol ACKs settle immediately; multiple UI refreshes share one display frame.
renderDevice412=function(){if(routing418){cancelAnimationFrame(deviceFrame418);presentDevice418();}else if(!deviceFrame418)deviceFrame418=requestAnimationFrame(presentDevice418);};
const ease418='cubic-bezier(.2,.85,.18,1)',motionAnimations418=new Set();
function animate418(element,frames,options){
 if(!element?.animate||motionReduced418())return null;
 const a=element.animate(frames,options);motionAnimations418.add(a);
 a.finished.catch(()=>{}).finally(()=>{motionAnimations418.delete(a);if(options.fill!=='forwards'&&options.fill!=='both')a.cancel();});return a;
}
function routePose418(page){const s=getComputedStyle(page);return{opacity:s.opacity,transform:s.transform==='none'?'translate3d(0,0,0)':s.transform};}
setTab=function(requested){
 const target=$('panel-'+requested)?requested:'control',previous=currentRoute412;
 if(target===previous)return;
 const old=activePage418,newPage=pages418.get(visibleKey418(target));
 // Capture before canceling: a second tap continues from the current visible pose.
 const oldPose=old?routePose418(old):null;
 const newPose=newPage.classList.contains('is-leaving')?routePose418(newPage):null;
 const layout=old?getComputedStyle(old.firstElementChild):null;
 const frozen=layout?{display:layout.display,columns:layout.gridTemplateColumns,rows:layout.gridTemplateRows,rowGap:layout.rowGap,columnGap:layout.columnGap}:null;
 resetRoute418();routeAnimation413?.cancel();
 const order=['control','draw','timer','settings'];
 const direction=order.includes(previous)&&order.includes(target)?Math.sign(order.indexOf(target)-order.indexOf(previous))||1:$('panel-'+previous)?.dataset.parent===target?-1:1;
 routing418=true;try{baseTab413(target);}finally{routing418=false;}
 activatePage418(newPage);syncTablet415();updateNav418(true);
 newPage.querySelectorAll('.segmented').forEach(updateSegment418);
 if(motionReduced418()||!old||old===newPage)return;
 const epoch=routeEpoch418;
 for(const [key,value]of Object.entries(frozen))old.style.setProperty('--outgoing-'+key,value);
 old.classList.add('is-leaving');old.setAttribute('inert','');old.setAttribute('aria-hidden','true');
 old.classList.add('is-animating');newPage.classList.add('is-animating');
 const incoming=animate418(newPage,[newPose||{opacity:0,transform:`translate3d(${direction*32}px,0,0)`},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:420,easing:ease418,fill:'both'});
 const outgoing=animate418(old,[oldPose,{opacity:0,transform:`translate3d(${-direction*24}px,0,0)`}],{duration:320,easing:'cubic-bezier(.3,0,.4,1)',fill:'both'});
 for(const a of [incoming,outgoing])if(a)routeAnimations418.add(a);
 // Keep the completed exit at opacity 0 until the incoming layer is ready.
 Promise.allSettled([incoming?.finished,outgoing?.finished]).then(()=>{if(epoch===routeEpoch418){
  old.classList.remove('is-leaving','is-animating');newPage.classList.remove('is-animating');
  incoming?.cancel();outgoing?.cancel();routeAnimations418.clear();
 }});
};

// The liquid selection tracks the actual button box, including borders and gaps.
const nav418=document.querySelector('nav'),indicator418=document.createElement('span');
indicator418.className='nav-liquid-indicator';indicator418.setAttribute('aria-hidden','true');nav418.prepend(indicator418);
let pillAnimation418=null,pillTarget418='';
function updateNav418(liquid=false){
 const selected=nav418.querySelector('button.active');if(!selected)return;
 const inset=innerWidth>=760?6:8,vertical=innerWidth>=760?4:3;
 const x=selected.offsetLeft+inset,y=selected.offsetTop+vertical;
 const width=Math.max(0,selected.offsetWidth-inset*2),height=Math.max(0,selected.offsetHeight-vertical*2);
 const key=[selected.dataset.tab,x,y,width,height].join(':');
 if(liquid&&key===pillTarget418&&pillAnimation418)return;
 const style=getComputedStyle(indicator418),from=style.transform,round=style.borderRadius;
 const matrix=new DOMMatrixReadOnly(from==='none'?undefined:from),dx=x-matrix.m41,dy=y-matrix.m42;
 pillAnimation418?.cancel();pillAnimation418=null;pillTarget418=key;
 indicator418.style.width=width+'px';indicator418.style.height=height+'px';
 const end=`translate3d(${x}px,${y}px,0) scale(1,1)`;indicator418.style.transform=end;
 if(!liquid||motionReduced418()||Math.hypot(dx,dy)<.5){indicator418.classList.remove('is-flowing');return;}
 const horizontal=innerWidth<760,sign=Math.sign(horizontal?dx:dy)||1;
 const pose=(t,sx,sy)=>`translate3d(${matrix.m41+dx*t}px,${matrix.m42+dy*t}px,0) scale(${sx},${sy})`;
 const droplet=horizontal?(sign>0?'48% 58% 58% 48% / 52% 50% 50% 52%':'58% 48% 48% 58% / 50% 52% 52% 50%'):(sign>0?'50% 50% 46% 46% / 44% 44% 62% 62%':'46% 46% 50% 50% / 62% 62% 44% 44%');
 indicator418.classList.add('is-flowing');
 // Sample a damped spring once; WebView interpolates the keyframes. There is
 // no JS animation loop, and retargeting starts at the current visible matrix.
 const frames=Array.from({length:41},(_,i)=>{
  const t=i/40,travel=1-Math.exp(-8*t)*(Math.cos(8*t)+Math.sin(8*t));
  const stretch=Math.sin(Math.PI*Math.min(1,t/.66))*Math.exp(-1.5*t);
  const rebound=t>.55?Math.sin((t-.55)/.45*Math.PI)*.055:0;
  const long=1+stretch*.38-rebound,short=1-stretch*.24+rebound;
  const settle=Math.exp(-12*t),sx=(horizontal?long:short)+(matrix.m11-1)*settle,sy=(horizontal?short:long)+(matrix.m22-1)*settle;
  return{offset:t,transform:i===0?from==='none'?end:from:i===40?end:pose(travel,sx,sy)};
 });
 frames[0].borderRadius=round;frames[10].borderRadius=droplet;frames[23].borderRadius=droplet;frames[40].borderRadius=horizontal?'20px':'16px';
 const a=animate418(indicator418,frames,{duration:620,easing:'linear',fill:'both'});
 pillAnimation418=a;
 a?.finished.catch(()=>{}).finally(()=>{if(pillAnimation418===a){a.cancel();pillAnimation418=null;indicator418.classList.remove('is-flowing');}});
}
function updateSegment418(nav){
 const tab=nav.querySelector('[aria-selected=true]');if(!tab||!nav.offsetWidth)return;
 nav.style.setProperty('--segment-x',tab.offsetLeft+'px');nav.style.setProperty('--segment-width',tab.offsetWidth+'px');
}
document.addEventListener('click',event=>{
 const tab=event.target.closest('.segmented [role=tab]');if(!tab)return;
 const nav=tab.closest('.segmented');updateSegment418(nav);
 const pane=[...nav.parentElement.children].find(p=>p.classList.contains('segment-pane')&&!p.hidden);
 pane?.getAnimations().forEach(a=>a.cancel());animate418(pane,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:360,easing:ease418});
});
document.querySelectorAll('.segmented').forEach(updateSegment418);
// A touch-driven lens follows the finger. Only its transform changes per frame.
const glint418=document.createElement('span');glint418.className='glass-glint';glint418.setAttribute('aria-hidden','true');nav418.append(glint418);
let navGesture418=null,navFrame418=0,navPoint418=null,suppressNavClick418=false;
function paintNavPointer418(){navFrame418=0;if(!navPoint418)return;
 const {x,y,rect}=navPoint418;glint418.style.transform=`translate3d(${x-rect.left-44}px,${y-rect.top-70}px,0)`;
 const g=navGesture418;if(!g||!g.dragged)return;
 const horizontal=rect.width>rect.height,position=horizontal?x-rect.left:y-rect.top;
 const size=horizontal?indicator418.offsetWidth:indicator418.offsetHeight;
 const limit=(horizontal?rect.width:rect.height)-size-12;
 const travel=Math.max(12,Math.min(limit,position-size/2));
 indicator418.style.transform=horizontal?`translate3d(${travel}px,11px,0)`:`translate3d(16px,${travel}px,0)`;
 g.target=[...nav418.querySelectorAll('button')].reduce((best,button)=>{const center=horizontal?button.offsetLeft+button.offsetWidth/2:button.offsetTop+button.offsetHeight/2;return !best||Math.abs(center-position)<best.distance?{button,distance:Math.abs(center-position)}:best;},null)?.button;
}
nav418.addEventListener('pointerdown',event=>{
 if(navGesture418||event.button!==0||!event.target.closest('button'))return;
 event.preventDefault(); // Own this gesture; avoid native text/link dragging.
 navGesture418={id:event.pointerId,x:event.clientX,y:event.clientY,rect:nav418.getBoundingClientRect(),dragged:false,target:null};
 nav418.classList.add('is-touching');
},{passive:false});
nav418.addEventListener('pointermove',event=>{
 const g=navGesture418;if(!g||g.id!==event.pointerId)return;
 if(!g.dragged&&Math.hypot(event.clientX-g.x,event.clientY-g.y)>9){g.dragged=true;nav418.setPointerCapture(event.pointerId);nav418.classList.add('is-dragging');pillAnimation418?.cancel();}
 navPoint418={x:event.clientX,y:event.clientY,rect:g.rect};if(!navFrame418)navFrame418=requestAnimationFrame(paintNavPointer418);
},{passive:true});
function finishNavGesture418(event){
 const g=navGesture418;if(!g||g.id!==event.pointerId)return;
 if(navFrame418){cancelAnimationFrame(navFrame418);paintNavPointer418();}
 navGesture418=null;navPoint418=null;nav418.classList.remove('is-dragging','is-touching');
 if(g.dragged){suppressNavClick418=true;setTimeout(()=>suppressNavClick418=false,0);
  if(event.type==='pointerup'&&g.target)setTab(g.target.dataset.tab);updateNav418(true);
 }
 if(nav418.hasPointerCapture(event.pointerId))nav418.releasePointerCapture(event.pointerId);
}
nav418.addEventListener('pointerup',finishNavGesture418);nav418.addEventListener('pointercancel',finishNavGesture418);
nav418.addEventListener('click',event=>{if(suppressNavClick418){event.preventDefault();event.stopImmediatePropagation();suppressNavClick418=false;}},true);

// Reveal the new compositor snapshot from the actual trigger, keeping the old
// theme intact outside the wave. No full-page repaint on each animation frame.
const commitAppearance418=applyAppearance413;
let themeTransition418=null,themeEpoch418=0,themeMode418='initial',themeCurtain418=null,pendingThemeCommit418=null;
let queuedAppearance418=null,desiredAppearance418=appearance413;
function finishTheme418(epoch){if(epoch!==themeEpoch418)return;themeTransition418=null;
 const queued=queuedAppearance418;queuedAppearance418=null;if(queued)applyAppearance413(queued.preference,queued.persist,queued.origin);
}
function themeOrigin418(element,event){
 const rect=(element||themeToggle413).getBoundingClientRect();
 const pointer=event?.detail>0&&Number.isFinite(event.clientX)&&Number.isFinite(event.clientY);
 return{x:Math.max(0,Math.min(innerWidth,pointer?event.clientX:rect.left+rect.width/2)),y:Math.max(0,Math.min(innerHeight,pointer?event.clientY:rect.top+rect.height/2))};
}
themeToggle413.addEventListener('click',event=>{event.stopImmediatePropagation();
 const dark=desiredAppearance418==='dark'||desiredAppearance418==='system'&&systemTheme413.matches;
 applyAppearance413(dark?'light':'dark',true,themeOrigin418(themeToggle413,event));
},true);
document.querySelectorAll('button[data-appearance]').forEach(button=>button.addEventListener('click',event=>{event.stopImmediatePropagation();applyAppearance413(button.dataset.appearance,true,themeOrigin418(button,event));},true));
function nativeAppearance418(pref){try{native?.setAppearanceAnimated?native.setAppearanceAnimated(pref,!motionReduced418()):native?.setAppearance?.(pref);}catch(ignored){}}
applyAppearance413=function(preference,persist=true,origin=themeOrigin418(themeToggle413)){
 if(!['light','dark','system'].includes(preference))preference='system';
 desiredAppearance418=preference;
 if((themeTransition418||themeCurtain418)&&!motionReduced418()&&!document.hidden){queuedAppearance418={preference,persist,origin};return;}
 queuedAppearance418=null;
 const dark=preference==='dark'||preference==='system'&&systemTheme413.matches;
 const changed=document.documentElement.dataset.theme!==(dark?'dark':'light'),epoch=++themeEpoch418;
 if(!changed&&preference===appearance413){if(persist)try{localStorage.setItem('lulu.appearance',preference);}catch(ignored){}themeMode418='unchanged';return;}
 pendingThemeCommit418=null;
 themeTransition418?.skipTransition();themeTransition418=null;themeCurtain418?.getAnimations().forEach(a=>a.cancel());themeCurtain418?.remove();themeCurtain418=null;
 const commit=()=>{if(epoch===themeEpoch418){commitAppearance418(preference,persist);nativeAppearance418(preference);}};
 if(!changed||motionReduced418()||document.hidden){themeMode418='instant';commit();return;}
 const x=Math.max(0,Math.min(innerWidth,origin.x)),y=Math.max(0,Math.min(innerHeight,origin.y));
 const radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y))+2;
 const root=document.documentElement;root.style.setProperty('--theme-x',x+'px');root.style.setProperty('--theme-y',y+'px');root.style.setProperty('--theme-radius',radius+'px');
 if(typeof document.startViewTransition==='function'){
  themeMode418='compositor-ripple';
  try{const transition=document.startViewTransition(commit);themeTransition418=transition;
   // Rapid input intentionally skips old transitions; their ready promise rejects.
   transition.ready.catch(()=>{});transition.updateCallbackDone.catch(()=>{});
   transition.finished.catch(()=>{}).finally(()=>finishTheme418(epoch));return;
  }catch(ignored){}
 }
 // Older WebView without snapshot support uses an expanding color wave, then
 // reveals the new controls. Keep the same origin and cancellation lifecycle.
 themeMode418='wave-fallback';const veil=document.createElement('div');veil.className='theme-curtain';themeCurtain418=veil;
 veil.style.background=dark?'#181a17':'#faf7f0';document.body.append(veil);
 pendingThemeCommit418=commit;
 const cover=animate418(veil,[{clipPath:`circle(0px at ${x}px ${y}px)`},{clipPath:`circle(${radius}px at ${x}px ${y}px)`}],{duration:600,easing:'cubic-bezier(.22,.7,.2,1)',fill:'forwards'});
 Promise.resolve(cover?.finished).then(()=>{if(epoch!==themeEpoch418)return;commit();pendingThemeCommit418=null;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}).then(()=>{
  if(epoch!==themeEpoch418)return;cover?.cancel();const out=animate418(veil,[{opacity:1},{opacity:0}],{duration:280,easing:ease418,fill:'forwards'});
  out?.finished.catch(()=>{}).finally(()=>{veil.remove();if(themeCurtain418===veil)themeCurtain418=null;finishTheme418(epoch);});
 }).catch(()=>{});
};

// Border-normal displacement bends the live background near the glass edges.
// The map is regenerated only when the navigation geometry changes.
let glassSize418='';
const glassSvg418=document.createElementNS('http://www.w3.org/2000/svg','svg');glassSvg418.setAttribute('class','glass-filter-defs');glassSvg418.setAttribute('aria-hidden','true');
glassSvg418.innerHTML='<defs><filter id="liquidNav418" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage id="liquidMap418" result="normals" preserveAspectRatio="none"/><feDisplacementMap in="SourceGraphic" in2="normals" scale="24" xChannelSelector="R" yChannelSelector="G"/></filter></defs>';
document.body.prepend(glassSvg418);
if(CSS.supports('backdrop-filter','url("#liquidNav418")'))nav418.style.backdropFilter='blur(.6px) url("'+location.href.split('#')[0]+'#liquidNav418") saturate(1.2)';
function updateGlass418(){
 const w=nav418.clientWidth,h=nav418.clientHeight,key=w+'x'+h;if(!w||!h||key===glassSize418)return;glassSize418=key;
 const map=document.createElement('canvas');map.width=w;map.height=h;const ctx=map.getContext('2d'),pixels=ctx.createImageData(w,h),r=26;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=x-w/2,sy=y-h/2,qx=Math.abs(sx)-(w/2-r),qy=Math.abs(sy)-(h/2-r),ox=Math.max(qx,0),oy=Math.max(qy,0),distance=Math.min(Math.max(qx,qy),0)+Math.hypot(ox,oy)-r;
  let nx=0,ny=0;if(ox||oy){const length=Math.hypot(ox,oy);nx=Math.sign(sx)*ox/length;ny=Math.sign(sy)*oy/length;}else if(qx>qy)nx=Math.sign(sx);else ny=Math.sign(sy);
  const strength=distance<=0?Math.pow(Math.max(0,1+distance/14),2):0,index=(y*w+x)*4;
  pixels.data[index]=128+nx*112*strength;pixels.data[index+1]=128+ny*112*strength;pixels.data[index+2]=128;pixels.data[index+3]=255;
 }
 ctx.putImageData(pixels,0,0);$('liquidMap418').setAttribute('href',map.toDataURL());
}
let resizeFrame418=0;
function resize418(){cancelAnimationFrame(resizeFrame418);resizeFrame418=requestAnimationFrame(()=>{if(themeTransition418||themeCurtain418||queuedAppearance418)settleMotion418();resetRoute418();updateNav418();updateGlass418();document.querySelectorAll('.segmented').forEach(updateSegment418);});}
if(typeof ResizeObserver==='function')new ResizeObserver(resize418).observe(nav418);window.addEventListener('resize',resize418);
updateNav418();updateGlass418();

let pressed418=null,pressAnimation418=null,pressId418=null;
document.addEventListener('pointerdown',event=>{
 const b=event.target.closest('button');if(!b||b.disabled||b.id==='emergencyStop'||nav418.contains(b)||motionReduced418())return;
 const from=getComputedStyle(b).transform;pressAnimation418?.cancel();pressed418=b;pressId418=event.pointerId;
 pressAnimation418=animate418(b,[{transform:from},{transform:'scale(.97)'}],{duration:130,easing:ease418,fill:'forwards'});
},{passive:true});
function release418(event){if(!pressed418||pressId418!==event.pointerId)return;const b=pressed418,from=getComputedStyle(b).transform;pressAnimation418?.cancel();pressed418=null;animate418(b,[{transform:from},{transform:'scale(1.012)',offset:.7},{transform:'scale(1)'}],{duration:380,easing:ease418});}
document.addEventListener('pointerup',release418,{passive:true});document.addEventListener('pointercancel',release418,{passive:true});
function settleMotion418(){
 if(navGesture418){const id=navGesture418.id;navGesture418=null;navPoint418=null;cancelAnimationFrame(navFrame418);navFrame418=0;nav418.classList.remove('is-dragging','is-touching');if(nav418.hasPointerCapture(id))nav418.releasePointerCapture(id);updateNav418();}
 resetRoute418();pressAnimation418?.cancel();pressed418=null;updateNav418();
 if(themeTransition418||themeCurtain418||queuedAppearance418){
  const preference=queuedAppearance418?.preference||desiredAppearance418;
  ++themeEpoch418;queuedAppearance418=null;pendingThemeCommit418=null;
  themeTransition418?.skipTransition();themeTransition418=null;themeCurtain418?.remove();themeCurtain418=null;
  commitAppearance418(preference);nativeAppearance418(preference);
 }
 for(const a of motionAnimations418)a.cancel();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)settleMotion418();});
const changedMotion418=()=>{motionState418();if(motionReduced418())settleMotion418();};
if(reducedMotion413.addEventListener)reducedMotion413.addEventListener('change',changedMotion418);else reducedMotion413.addListener(changedMotion418);

let launchDismissed418=false;
window.startupReady418=function(){
 if(launchDismissed418)return;launchDismissed418=true;document.documentElement.classList.remove('booting');
 const cover=$('launchCover');if(!cover)return;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{const exit=animate418(cover,[{opacity:1},{opacity:0}],{duration:420,easing:ease418});if(exit)exit.finished.catch(()=>{}).finally(()=>cover.remove());else cover.remove();}));
};
function applicationReady418(){Promise.resolve($('launchCover').querySelector('img').decode?.()).catch(()=>{}).then(()=>{try{if(typeof native?.pageReady==='function'){native.pageReady();return;}}catch(ignored){}window.startupReady418();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applicationReady418,{once:true});else applicationReady418();

