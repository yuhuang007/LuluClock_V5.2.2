'use strict';
// App-only polish. Device commands and the bundled 4.1.2 image are unchanged.
document.body.classList.add('app413');
const svg413=(content,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
const sun413=svg413('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>');
const moon413=svg413('<path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/>');
const orange413='<svg viewBox="0 0 112 112" aria-hidden="true"><path d="M57 24c-1-9 5-15 15-14-1 9-7 13-15 14" fill="#73845a"/><path d="M55 27c-3-5-7-8-11-8" fill="none" stroke="#9a6b3b" stroke-width="3" stroke-linecap="round"/><path d="M56 27c-21-7-39 7-38 31 1 25 17 37 38 37s37-12 38-37C95 34 77 20 56 27" fill="#eea03c"/><path d="M28 53c1-11 7-17 15-19" fill="none" stroke="#ffcc76" stroke-width="5" stroke-linecap="round"/><path d="M75 75h1M67 82h1M81 66h1" stroke="#d88731" stroke-width="2" stroke-linecap="round"/></svg>';
const device413='<svg viewBox="0 0 90 100" aria-hidden="true"><rect x="12" y="25" width="66" height="64" rx="20" fill="var(--device-shell)" stroke="var(--device-edge)" stroke-width="1.5"/><path d="M26 42h38" stroke="var(--device-edge)" stroke-width="1.2"/><rect x="25" y="67" width="40" height="8" rx="4" fill="var(--device-edge)" opacity=".55"/><path d="m25 61 12-12 10 5 16-11" fill="none" stroke="var(--l-accent)" stroke-width="2" stroke-linecap="round"/><circle cx="25" cy="61" r="3" fill="var(--l-accent)"/><circle cx="63" cy="43" r="3" fill="var(--l-accent)"/><rect x="37" y="16" width="16" height="12" rx="6" fill="#efa238"/><path d="M45 16q2-8 9-7-1 6-9 7" fill="#77885c"/><path d="M27 89v4M63 89v4" stroke="var(--device-edge)" stroke-width="3" stroke-linecap="round"/></svg>';

document.title='噜噜绘时钟';
const brand413=document.querySelector('header .brand');
brand413.querySelector('.brand-mark').innerHTML=orange413;
brand413.querySelector('strong').textContent='噜噜';brand413.querySelector('small').textContent='绘时钟';
const tools413=document.createElement('div');tools413.className='header-tools';
const themeToggle413=document.createElement('button');themeToggle413.id='themeToggle';themeToggle413.className='theme-toggle';themeToggle413.type='button';
const stop413=$('emergencyStop');
stop413.innerHTML=svg413('<rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" stroke="none"/>')+'<span>停止</span>';
stop413.setAttribute('aria-label','停止任务并关灯');stop413.title='停止任务并关灯';
tools413.append(themeToggle413,$('connectionButton'),stop413);document.querySelector('header').append(tools413);
document.querySelector('.safety-bar').remove();
$('connectionButton').setAttribute('aria-label','蓝牙连接');
document.querySelector('.device-art').innerHTML=device413;
home412.querySelector('.device-card h1').textContent='我的绘时钟';
home412.querySelector('.device-card-info>small').textContent='LULU CLOCK';
homeHero412.querySelector('.eyebrow').textContent='此刻，慢慢来';
const citrus413=document.createElement('div');citrus413.className='hero-citrus';citrus413.innerHTML=orange413;homeHero412.append(citrus413);
document.querySelector('#drawTime .action-icon').innerHTML=icon412('timer');
document.querySelector('#drawDate .action-icon').innerHTML=icon412('calendar');
icons412.settings='<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h3l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="10.5" cy="12" r="3"/>';
document.querySelector('nav button[data-tab=settings]').innerHTML=icon412('settings')+'<span>设置</span>';
document.querySelector('#panel-settings .page-title h1').textContent='设置';
document.querySelector('#panel-settings .page-title p').textContent='让时钟更合你的习惯';
draw412.querySelector('.page-heading p').textContent='画几笔，把灵感留给时钟。';
timer412.querySelector('.page-heading p').textContent='留一点时间，专注于当下。';
$('connectCard').querySelector('.eyebrow').textContent='很高兴见到你';
$('connectCard').querySelector('h1').textContent='和噜噜，一起开始';
$('connectCard').querySelector('p').textContent='开启蓝牙，连接附近的 小噜蓝牙时钟。';
$('scanNote').textContent='连接后即可绘图、计时和管理你的时钟。';

// Theme choice is local, persistent, usable offline and follows system by default.
const appearanceView413=routeView412('appearance','外观与主题');
appearanceView413.insertAdjacentHTML('beforeend',`<div class="appearance-intro"><span class="appearance-symbol">${sun413}</span><h2>换一种光线</h2><p>柔和的浅色，或安静的深色。</p></div><div class="theme-choices" role="group" aria-label="选择主题"><button data-appearance="light" class="theme-choice"><span class="theme-preview preview-light" aria-hidden="true"><i></i><i></i><i></i></span><strong>浅色</strong><small>奶油白 · 橘色</small><span class="choice-check" aria-hidden="true">✓</span></button><button data-appearance="dark" class="theme-choice"><span class="theme-preview preview-dark" aria-hidden="true"><i></i><i></i><i></i></span><strong>深色</strong><small>暖黑 · 柔橘</small><span class="choice-check" aria-hidden="true">✓</span></button><button data-appearance="system" class="theme-choice"><span class="theme-preview preview-system" aria-hidden="true"><i></i><i></i><i></i></span><strong>跟随系统</strong><small>自动切换</small><span class="choice-check" aria-hidden="true">✓</span></button></div><p class="hint appearance-note">设置保存在这台手机。也可以点右上角的日月图标快速切换。</p><div class="motion-setting"><span>${svg413('<path d="M3 7h12M3 12h18M3 17h9"/>')}<strong>轻柔动效</strong><small>遵循系统的减少动态效果设置</small></span></div>`);
const appearanceMenu413=document.createElement('div');
menu412(appearanceMenu413,[['appearance','外观与主题','跟随系统','sliders']]);
settings412.querySelector('.menu-group').prepend(appearanceMenu413.querySelector('.menu-row'));
settings412.querySelector('[data-menu-route=drawing-settings]').closest('.menu-group').classList.add('settings-preferences');
// Keep occasional setup tools behind a compact, accessible disclosure.
const maintenance413=document.createElement('details');maintenance413.className='settings-maintenance';
maintenance413.innerHTML='<summary><span>设备维护</span><small>校准与调试工具</small></summary>';
const maintenanceGroup413=document.createElement('div');maintenanceGroup413.className='menu-group';
for(const route of ['calibrate','device-tools'])maintenanceGroup413.append(settings412.querySelector(`[data-menu-route="${route}"]`).closest('button'));
maintenance413.append(maintenanceGroup413);
const aboutGroup413=settings412.querySelector('[data-menu-route=about]').closest('.menu-group');
aboutGroup413.before(maintenance413);
const systemTheme413=matchMedia('(prefers-color-scheme: dark)');
const reducedMotion413=matchMedia('(prefers-reduced-motion: reduce)');
let appearance413=document.documentElement.dataset.appearance||'system';
const appearanceLabels413={system:'跟随系统',light:'浅色',dark:'深色'};
function applyAppearance413(preference,persist=true){
 if(!['light','dark','system'].includes(preference))preference='system';
 appearance413=preference;
 const dark=preference==='dark'||preference==='system'&&systemTheme413.matches;
 const theme=dark?'dark':'light',root=document.documentElement;
 root.dataset.theme=theme;root.dataset.appearance=preference;
 if(persist)try{localStorage.setItem('lulu.appearance',preference);}catch(ignored){}
 document.querySelector('meta[name=color-scheme]').content=theme;
 themeToggle413.innerHTML=dark?sun413:moon413;
 themeToggle413.setAttribute('aria-label',dark?'切换为浅色主题':'切换为深色主题');
 themeToggle413.title=dark?'切换为浅色主题':'切换为深色主题';
 document.querySelectorAll('button[data-appearance]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.appearance===preference)));
 document.querySelectorAll('[data-menu-route=appearance]').forEach(e=>e.textContent=appearanceLabels413[preference]);
 try{if(!document.body.classList.contains('app414'))native?.setAppearance?.(preference);}catch(ignored){}
 renderCanvas();
}
document.querySelectorAll('button[data-appearance]').forEach(b=>b.addEventListener('click',()=>applyAppearance413(b.dataset.appearance)));
themeToggle413.addEventListener('click',()=>applyAppearance413(document.documentElement.dataset.theme==='dark'?'light':'dark'));
const systemThemeChanged413=()=>{if(appearance413==='system')applyAppearance413('system',false);};
if(systemTheme413.addEventListener)systemTheme413.addEventListener('change',systemThemeChanged413);else systemTheme413.addListener(systemThemeChanged413);

// Keep the old route lifecycle, cancel previous animations and retain scroll per page.
const baseTab413=setTab,scroll413=new Map();
let routeAnimation413=null;
setTab=function(name){
 const previous=currentRoute412,main=document.querySelector('main');
 scroll413.set(previous,main.scrollTop);routeAnimation413?.cancel();
 baseTab413(name);
 const index=['control','draw','timer','settings'].indexOf(parent412(currentRoute412));
 document.querySelector('nav').style.setProperty('--nav-index',String(Math.max(index,0)));
 if(previous===currentRoute412)return;
 main.scrollTop=scroll413.get(currentRoute412)||0;
 const panel=$('panel-'+currentRoute412);
 if(!reducedMotion413.matches&&typeof panel.animate==='function'){
  const returning=$('panel-'+previous)?.dataset.parent===currentRoute412;
  const sub=panel.classList.contains('route-view')||returning;
  routeAnimation413=panel.animate([{opacity:0,transform:sub?`translateX(${returning?-12:16}px)`:'translateY(9px)'},{opacity:1,transform:'translate(0,0)'}],{duration:210,easing:'cubic-bezier(.2,.8,.2,1)'});
 }
};
const cancelMotion413=()=>{if(reducedMotion413.matches)routeAnimation413?.cancel();};
if(reducedMotion413.addEventListener)reducedMotion413.addEventListener('change',cancelMotion413);else reducedMotion413.addListener(cancelMotion413);

const aboutLogo413=aboutView412.querySelector('.about-logo');aboutLogo413.innerHTML=orange413;
aboutView412.querySelector('.about-card h2').textContent='噜噜绘时钟';
aboutView412.querySelector('.about-card>p').textContent='App 4.1.3';
document.querySelectorAll('[data-menu-route=about]').forEach(e=>e.textContent='App 4.1.3');
document.querySelector('footer').textContent='噜噜绘时钟 · 4.1.3';
document.querySelector('main').append(document.querySelector('footer'));
const render413=renderDevice412;
renderDevice412=function(){render413();stop413.disabled=!ready;stop413.classList.toggle('is-running',ready&&(state.busy==='1'||Number(state.timer||0)>0||otaBusy));};
applyAppearance413(appearance413,false);renderDevice412();
