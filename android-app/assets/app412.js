'use strict';
// Reuse the existing control nodes and listeners while giving each task a route.
document.body.classList.add('app412');
const icons412={device:'<rect x="6" y="3" width="12" height="18" rx="4"/><circle cx="12" cy="10" r="3"/><path d="M12 8v2l1 1M10 17h4"/>',draw:'<path d="m4 16 12-12 4 4L8 20H4zM13 7l4 4"/>',timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/>',settings:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',wifi:'<path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1"/>',update:'<path d="M20 8a9 9 0 1 0 1 7M20 3v6h-6M12 7v5l3 2"/>',sliders:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',sound:'<path d="M4 10h4l5-5v14l-5-5H4zM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18M7 15h3M14 15h3"/>',key:'<rect x="4" y="5" width="16" height="14" rx="4"/><path d="M8 10h8M8 14h5"/>',env:'<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0M12 7v10"/>'};
const icon412=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons412[name]||icons412.device}</svg>`;
const q412=selector=>document.querySelector(selector);
function card412(title){return [...document.querySelectorAll('.feature-card')].find(e=>e.querySelector('h2')?.textContent===title);}
function routeView412(id,title,parent='settings'){
 const s=document.createElement('section');s.id='panel-'+id;s.className='panel route-view';s.dataset.parent=parent;
 s.innerHTML=`<div class="route-heading"><button class="back-button" aria-label="返回">‹</button><h1>${title}</h1><span></span></div>`;
 s.querySelector('button').addEventListener('click',()=>setTab(parent));document.querySelector('main').append(s);return s;
}
function menu412(parent,items){
 const box=document.createElement('div');box.className='menu-group';
 for(const [route,title,subtitle,icon] of items){const b=document.createElement('button');b.className='menu-row';b.innerHTML=`<span class="menu-icon">${icon412(icon)}</span><span><strong>${title}</strong><small data-menu-route="${route}">${subtitle}</small></span><span class="row-arrow">›</span>`;b.addEventListener('click',()=>setTab(route));box.append(b);}
 parent.append(box);
}
function tabs412(host,items){
 const nav=document.createElement('div');nav.className='segmented';nav.setAttribute('role','tablist');
 const panes=items.map(([title,nodes],index)=>{
  const pane=document.createElement('div');pane.className='segment-pane';pane.hidden=index!==0;nodes.filter(Boolean).forEach(node=>pane.append(node));
  const b=document.createElement('button');b.textContent=title;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(index===0));
  b.addEventListener('click',()=>{panes.forEach((p,i)=>{p.hidden=i!==index;nav.children[i].setAttribute('aria-selected',String(i===index));});if(typeof renderCanvas==='function')renderCanvas();});nav.append(b);return pane;
 });host.append(nav,...panes);return panes;
}
const home412=$('panel-control'),draw412=$('panel-draw'),timer412=$('panel-timer'),settings412=$('panel-settings'),cal412=$('panel-calibrate');
const drawingSettings412=q412('#panel-control>.settings'),profile412=card412('描绘强度'),patterns412=q412('#panel-control>.patterns'),tools412=q412('#panel-control>.utility-row');
const homeHero412=q412('#panel-control>.hero'),homeActions412=$('drawTime').closest('.action-grid'),autoRow412=$('autoToggle').closest('label');
const syncTime412=$('syncTime');
const env412=$('boardCard');const environmentView412=routeView412('environment','屏幕与环境');environmentView412.append(env412);
const drawingView412=routeView412('drawing-settings','绘制设置');drawingView412.append(drawingSettings412,profile412);
const toolView412=routeView412('device-tools','设备工具');toolView412.append(tools412);menu412(toolView412,[['patterns','测试图形','检查运动轨迹','draw'],['calibrate','机械校准','安装定位与实时微调','sliders']]);
const patternView412=routeView412('patterns','测试图形','draw');patternView412.append(patterns412);patternView412.insertAdjacentHTML('beforeend','<p class="hint">建议先开启灭灯空走，确认机械臂周围无障碍。</p>');
const wifiView412=routeView412('wifi','网络连接');wifiView412.append($('wifiCard'));
const updateView412=routeView412('update','固件更新');updateView412.append($('otaCard'));
const soundView412=routeView412('sound','声音与提醒');soundView412.append($('soundCard'));
const keysView412=routeView412('keys','按键设置');keysView412.append(card412('按键自定义'));
const plansView412=routeView412('plans','自动计划');plansView412.append(card412('定时绘图与计时'));
const chimeView412=routeView412('chime','整点提醒');chimeView412.append(card412('整点提示'));
const aboutView412=routeView412('about','关于设备');aboutView412.insertAdjacentHTML('beforeend','<div class="about-card"><span class="about-logo">◷</span><h2>绘时钟</h2><p>App 4.1.3</p><div class="info-pair"><span>固件版本</span><strong id="aboutFirmwareVersion">未连接</strong></div><div class="info-pair"><span>设备</span><strong>ESP32-S3 N16R8</strong></div><div class="info-pair"><span>板载 RGB</span><strong>GPIO48</strong></div></div>');
const connection412=card412('连接与设备');const technical412=document.createElement('details');technical412.innerHTML='<summary>运行状态与诊断</summary>';technical412.append(connection412);aboutView412.append(technical412);
// Keep the first screen focused on the connected device and everyday actions.
home412.replaceChildren();home412.insertAdjacentHTML('beforeend',`<div class="device-card"><div class="device-art">${icon412('device')}</div><div class="device-card-info"><small>我的设备</small><h1>绘时钟 S3</h1><p id="homeConnection">等待连接</p><button id="homeVersion" class="version-chip">固件版本 · 未连接</button></div><button id="deviceAbout" class="icon-button" aria-label="设备信息">${icon412('info')}</button></div>`);
home412.append(homeHero412,$('taskCard'));homeHero412.querySelector('.eyebrow').textContent='本地时间';homeHero412.querySelector('.arm-sketch')?.remove();
home412.insertAdjacentHTML('beforeend','<div class="section-title"><h2>快捷操作</h2></div>');home412.append(homeActions412);
const autoCard412=document.createElement('div');autoCard412.className='compact-setting';autoCard412.append(autoRow412);home412.append(autoCard412);
menu412(home412,[['wifi','网络连接','选择附近的 Wi-Fi','wifi'],['environment','屏幕与环境','温湿度与屏幕控制','env']]);
syncTime412.textContent='同步手机时间';toolView412.append(syncTime412);
$('deviceAbout').addEventListener('click',()=>setTab('about'));
$('homeVersion').addEventListener('click',()=>run(async()=>{if(!ready)return;deviceVersion412='';versionError412=false;versionBusy412=true;renderDevice412();try{const fields=parseState(await command('GET'));if(fields.v)deviceVersion412=fields.v;else versionError412=true;}catch(error){versionError412=true;}finally{versionBusy412=false;renderDevice412();}}));
// Four destinations; settings contains entrances rather than every form.
settings412.replaceChildren();settings412.insertAdjacentHTML('beforeend','<div class="page-title"><h1>设备设置</h1><p>连接、偏好与设备管理</p></div>');
menu412(settings412,[['wifi','网络连接','选择附近的 Wi-Fi','wifi'],['update','固件更新','读取版本与选择应用固件','update']]);
menu412(settings412,[['drawing-settings','绘制设置','速度与描绘方式','sliders'],['sound','声音与提醒','提示音与免打扰','sound'],['keys','按键设置','自定义实体按键','key'],['plans','自动计划','按星期安排任务','calendar'],['chime','整点提醒','报时与提醒时段','timer']]);
menu412(settings412,[['calibrate','机械校准','安装定位与实时微调','sliders'],['device-tools','设备工具','同步、归位与灯光测试','device'],['about','关于设备','App 4.1.3','info']]);
// Creation tools are separate pages, with a clean drawing canvas as the default.
const editCard412=card412('编辑与文字'),favorites412=card412('图案收藏');
const textView412=routeView412('text','文字创作','draw');const editGrid412=editCard412.querySelector('.edit-grid');editGrid412.remove();textView412.append(editCard412);
const favoritesView412=routeView412('favorites','图案收藏','draw');favoritesView412.append(favorites412);
draw412.querySelector('.page-heading').innerHTML='<h1>创作</h1><p>在画布上留下你的图案</p>';
const createTools412=document.createElement('div');createTools412.className='creation-tools';
for(const [route,label]of [['text','文字'],['favorites','收藏'],['patterns','测试图形']]){const b=document.createElement('button');b.textContent=label;b.addEventListener('click',()=>setTab(route));createTools412.append(b);}
draw412.querySelector('.page-heading').after(createTools412);
const edits412=document.createElement('details');edits412.className='canvas-edit';edits412.innerHTML='<summary>调整图案</summary>';edits412.append(editGrid412);draw412.querySelector('.canvas-card').after(edits412);
draw412.querySelector('.note').innerHTML='<p>最多2048点。发送前确认机械臂周围无障碍，急停可取消任务。</p>';
// Countdown and focus get separate modes without a long stack of forms.
timer412.querySelector('.page-heading').innerHTML='<h1>计时</h1><p>倒计时与专注，离开手机也能继续</p>';
const countdown412=[timer412.querySelector('.presets'),timer412.querySelector('.timer-input'),$('startTimer'),$('saveTimerPreset')];const pomo412=card412('番茄钟循环');
const timerFace412=timer412.querySelector('.timer-face');timer412.replaceChildren(timer412.querySelector('.page-heading'),timerFace412);tabs412(timer412,[['倒计时',countdown412],['番茄钟',[pomo412]]]);
// Keep only one schedule editor open at a time.
const planItems412=[...$('planFields').children];$('planFields').replaceChildren();tabs412($('planFields'),planItems412.map((node,i)=>['计划'+(i+1),[node]]));
// Sound detail is progressively disclosed instead of filling the first screen.
function fold412(label,nodes,host){const d=document.createElement('details');d.innerHTML='<summary></summary>';d.querySelector('summary').textContent=label;nodes.filter(Boolean).forEach(n=>d.append(n));host.append(d);return d;}
const soundCard412=$('soundCard');
const soundAdvanced412=[$('soundNight').closest('label'),$('soundFrom').closest('label'),$('soundTo').closest('label')];
fold412('声音免打扰（仅声音）',soundAdvanced412,soundCard412);fold412('音效试听',[$('soundPreviews'),$('soundReminder'),$('silenceSound')],soundCard412);
soundCard412.querySelector('.sound-preview-title')?.remove();
// Calibration keeps position, tuning and the check wizard in distinct modes.
cal412.querySelector('.page-heading').innerHTML='<h1>机械校准</h1><p>先定位，再微调，最后检查轨迹</p>';
const installCard412=cal412.querySelector('.install-card'),calFields412=cal412.querySelector('.cal-fields'),calActions412=$('saveCal').closest('.action-grid'),wizardCard412=card412('校准检查向导');
const tuning412=document.createElement('div');tuning412.append($('calLiveStatus'),$('calPoseHint'),calFields412,calActions412,$('loadSavedCal'),$('restoreCal'));
fold412('当前值与已保存值',[$('calCompare')],tuning412);
cal412.replaceChildren(cal412.querySelector('.page-heading'),installCard412);tabs412(cal412,[['安装定位',[]],['参数微调',[tuning412]],['检查向导',[wizardCard412]]]);
cal412.classList.add('route-view');cal412.dataset.parent='settings';cal412.insertAdjacentHTML('afterbegin','<button id="calBack" class="back-button">‹ 返回设置</button>');$('calBack').addEventListener('click',()=>setTab('settings'));
// Firmware and RGB are a short status page; maintenance stays behind details.
$('otaCard').querySelector('h2').textContent='设备固件';
const otaHints412=$('otaCard').querySelectorAll(':scope>p.hint');
otaHints412[0].textContent='连接后可读取设备版本。升级时选择本地编译的应用固件，手机与时钟连接同一 Wi-Fi，并保持蓝牙连接。';
otaHints412[otaHints412.length-1].textContent='升级时保持供电。时钟重启会短暂断连，App 会自动连回并核对版本；新固件生效后红绿蓝各亮一次。';
const rgbMaintenance412=$('rgbMaintenance');$('rgbPin').value='48';$('rgbPin').closest('label').hidden=true;$('rgbSave').hidden=true;rgbMaintenance412.querySelector('summary').textContent='RGB 提示灯测试';
$('rgbStatus').textContent='板载RGB引脚已确认 GPIO48。';
// Compact connection flow and consistent chrome.
$('connectCard').querySelector('.eyebrow').textContent='开始使用';$('connectCard').querySelector('h1').textContent='添加你的时钟';$('connectCard').querySelector('p').textContent='开启蓝牙，连接附近的 小噜蓝牙时钟。';
$('scanButton').innerHTML='搜索蓝牙设备';$('emergencyStop').textContent='停止 / 关灯';
const safetyBar412=document.createElement('div');safetyBar412.className='safety-bar';safetyBar412.append($('emergencyStop'));document.body.append(safetyBar412);
document.querySelector('header .brand small').textContent='设备控制中心';
document.querySelector('footer').textContent='噜噜时钟 4.1.3';
document.querySelector('main').append(document.querySelector('footer'));
const nav412=document.querySelector('nav');nav412.replaceChildren();
for(const [route,label,icon]of [['control','设备','device'],['draw','创作','draw'],['timer','计时','timer'],['settings','设置','settings']]){
 const b=document.createElement('button');b.dataset.tab=route;b.innerHTML=icon412(icon)+'<span>'+label+'</span>';b.addEventListener('click',()=>setTab(route));nav412.append(b);
}
let currentRoute412='control',deviceVersion412='',versionBusy412=false,versionError412=false;
const parent412=name=>['control','draw','timer','settings'].includes(name)?name:({text:'draw',favorites:'draw',patterns:'draw',environment:'control'}[name]||'settings');
setTab=function(name){
 if(!$('panel-'+name))name='control';
 if(currentRoute412!==name){cancelLiveCal();if(currentRoute412==='wifi')cancelNearbyWifi();}
 currentRoute412=name;activeTab=name;
 document.querySelectorAll('.panel').forEach(panel=>panel.classList.toggle('active',panel.id==='panel-'+name));
 document.querySelectorAll('nav button').forEach(button=>button.classList.toggle('active',button.dataset.tab===parent412(name)));
 window.scrollTo(0,0);document.querySelector('main').scrollTop=0;if(name==='draw')renderCanvas();
 if(name==='calibrate'&&ready)refresh().catch(error=>toast(error.message));
 if(name==='wifi'&&ready&&!wifiScanDone)scanNearbyWifi();
 renderDevice412();
};
window.handleAppBack=()=>{if(wifiDialog.open){wifiDialog.close();$('wifiPassword').value='';return true;}if(currentRoute412!=='control'){setTab($('panel-'+currentRoute412).dataset.parent||'control');return true;}return false;};
function renderDevice412(){
 home412.hidden=!ready;$('connectCard').hidden=ready||currentRoute412!=='control';
 $('homeConnection').textContent=ready?(state.busy==='1'?'已连接 · 任务执行中':'蓝牙已连接'):'蓝牙未连接';
 $('homeConnection').classList.toggle('is-connected',ready);
 $('homeVersion').textContent=!ready?'固件版本 · 未连接':deviceVersion412?'固件 '+deviceVersion412:versionError412?'版本读取失败 · 点击重试':'正在读取固件版本…';
 $('homeVersion').disabled=!ready;
 $('aboutFirmwareVersion').textContent=ready?(deviceVersion412||'读取中…'):'未连接';
 document.querySelectorAll('[data-menu-route="update"]').forEach(e=>e.textContent=ready&&deviceVersion412?'当前固件 '+deviceVersion412:'连接后检查版本');
 const networkName=wifiText(wifi412State.ssid);document.querySelectorAll('[data-menu-route="wifi"]').forEach(e=>e.textContent=ready?(networkName||'选择附近的 Wi-Fi'):'连接设备后配置');
 const envText=ready&&boardEnv?.sensor==='valid'?`${boardEnv.temp}°C · ${boardEnv.humidity}%`:'温湿度与屏幕控制';document.querySelectorAll('[data-menu-route="environment"]').forEach(e=>e.textContent=envText);
 $('taskCard').hidden=!ready||(state.busy!=='1'&&Number(state.timer||0)===0);
 $('resourceLabel').textContent=ready?'已连接':'未连接';
}
const nativeShell412=window.onNativeEvent;
window.onNativeEvent=async event=>{
 if(event.type==='connection'){
  deviceVersion412='';versionError412=false;versionBusy412=event.state==='ready';renderDevice412();
 }
 await nativeShell412(event);
 if(event.type==='line'){
  const match=/^\d+\|STATE\|(.*)$/.exec(event.line);if(match&&ready){const fields=parseState(match[1]);if(fields.v){deviceVersion412=fields.v;versionError412=false;versionBusy412=false;}}
 }
 if(event.type==='connection'&&event.state==='ready'){versionBusy412=false;if(!deviceVersion412)versionError412=true;}
 renderDevice412();
};
setTab('control');
$('connectionButton').addEventListener('click',()=>{if(!ready)setTab('control');},true);
