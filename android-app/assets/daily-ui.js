'use strict';
const policy=DailyPolicyUI;
const policyStore=new policy.Store((...args)=>command(...args),parseState);
let policyFlight=null,policyEpoch=0,policySound=null,policyJob=null,policyLight=null,policyStateAt=0;
let policyReadError='';
const policyDirty={DAILY:new Set(),DISPLAY:new Set()},policyDraft={DAILY:{},DISPLAY:{}};
const dailyView=routeView412('daily','日常策略');
dailyView.insertAdjacentHTML('beforeend','<p id="dailyStatus" class="hint" role="status">连接后读取硬件设置。</p>');
const policyInput=(type,key,label,kind='number',limits='')=>`<label class="form-row">${label}<input data-policy="${type}" data-field="${key}" type="${kind}" ${limits} disabled></label>`;
const nightCard=document.createElement('div');nightCard.className='feature-card';
nightCard.innerHTML=`<h2>系统夜间模式</h2><p class="hint">影响自动绘时、定时计划、声音、灯带和 OLED 亮度；与“声音免打扰”分别设置。</p>${policyInput('DAILY','night','启用系统夜间模式','checkbox')}${policyInput('DAILY','nfrom','开始时间','time')}${policyInput('DAILY','nto','结束时间','time')}${policyInput('DAILY','dim','夜间 OLED 亮度上限（%）','number','min="5" max="100"')}<p class="hint">支持跨午夜，开始和结束不能相同。</p>`;
const automaticCard=document.createElement('div');automaticCard.className='feature-card';
automaticCard.innerHTML=`<h2>自动绘时</h2>${policyInput('DAILY','every','间隔（分钟）','number','min="1" max="60"')}${policyInput('DAILY','from','有效时段开始','time')}${policyInput('DAILY','to','有效时段结束','time')}<p class="hint">开始和结束相同表示全天。总开关在设备首页，系统夜间模式优先。</p><p id="dailyNext" class="hint"></p>`;
const ambientCard=document.createElement('div');ambientCard.className='feature-card';
ambientCard.innerHTML=`<h2>光敏自动灯带</h2>${policyInput('DAILY','ambient','启用光敏自动控制','checkbox')}<label class="form-row">暗光电平<select data-policy="DAILY" data-field="darklow" disabled><option value="0">高电平为暗（当前硬件默认）</option><option value="1">低电平为暗</option></select></label><p class="hint">每次开机需观察到两次稳定电平变化，才允许自动接管。持续一个电平不能证明传感器正常。</p><p class="hint">手动操作灯带或停止任务可能覆盖自动控制，重新保存日常策略或重启会恢复。当前固件未上报手动覆盖标记，App 无法确认实际控制来源。</p>`;
tabs412(dailyView,[['夜间',[nightCard]],['绘时',[automaticCard]],['灯带',[ambientCard]]]);
dailyView.insertAdjacentHTML('beforeend','<button id="saveDailyPolicy" class="primary full" disabled>保存已修改设置</button><button id="readDailyPolicy" class="text-button">重新读取硬件</button>');
menu412(settings412,[['daily','日常策略','系统夜间、自动绘时与光敏灯带','sliders'],['display-settings','OLED 设置','动效、熄屏与基础亮度','env']]);
const dailyMenu=settings412.lastElementChild;settings412.querySelectorAll('.menu-group')[1]?.before(dailyMenu);
const displayView=routeView412('display-settings','OLED 设置');
displayView.insertAdjacentHTML('beforeend',`<div class="feature-card"><p id="displayPolicyStatus" class="hint" role="status">连接后读取硬件设置。</p>${policyInput('DISPLAY','animation','启用屏幕动效','checkbox')}${policyInput('DISPLAY','sleep','熄屏时间（秒，0 为常亮）','number','min="0" max="3600"')}${policyInput('DISPLAY','brightness','基础亮度（%）','number','min="5" max="100"')}<p class="hint">熄屏支持常亮或 15–3600 秒。系统夜间亮度上限在“日常策略”中设置。硬件尚未上报最终生效亮度和限制来源，此处显示的是基础设置。</p><button id="saveDisplayPolicy" class="primary full" disabled>保存已修改设置</button><button id="readDisplayPolicy" class="text-button">重新读取硬件</button></div>`);
// Register late-added pages with the existing persistent animated route shell.
for(const panel of [dailyView,displayView]){
 const page=document.createElement('div');page.className='route-page';page.dataset.page=panel.id.slice(6);
 panel.before(page);page.append(panel);page.setAttribute('inert','');page.setAttribute('aria-hidden','true');pages418.set(page.dataset.page,page);
}
dailyView.querySelectorAll('.segmented').forEach(updateSegment418);
menu412(environmentView412,[['display-settings','OLED 设置','动效、熄屏与基础亮度','env'],['daily','日常策略','夜间与光敏控制','sliders']]);
$('boardLight').insertAdjacentHTML('afterend','<p id="lightPolicyState" class="hint" role="status"></p>');
$('soundStatus').insertAdjacentHTML('afterend','<label class="form-row">全局静音<input id="policyQuiet" type="checkbox" disabled></label>');
$('policyQuiet').addEventListener('change',()=>run(async()=>{try{await command('QUIET',$('policyQuiet').checked?1:0);}finally{await refresh();}}));
menu412(soundView412,[['daily','系统夜间模式','影响声音、绘时、灯带与屏幕','sliders']]);
$('taskCard').insertAdjacentHTML('beforeend','<button id="policyHome" class="secondary" hidden>先归位</button>');
$('policyHome').addEventListener('click',()=>run(async()=>{await command('HOME');await refresh();},'已请求归位，请等待硬件完成'));
for(const [route,label]of [['daily','日常策略'],['display-settings','OLED 设置']]){
 const list=tabletSections415.querySelector('[data-section="settings"]'),b=document.createElement('button');b.textContent=label;b.dataset.route=route;b.addEventListener('click',()=>setTab(route));list.append(b);
}
const policyControls=[...document.querySelectorAll('[data-policy]')];
$('otaFile').insertAdjacentHTML('beforebegin','<p id="policyFirmwareVersions" class="hint">设备当前固件：未连接</p>');
const hasPolicy=type=>ready&&boardCaps?.[type==='DAILY'?'daily':'display']==='1';
const policyBlocked=()=>!ready||document.hidden||otaBusy||uploading||wifiScanBusy;
function policyFields(type){
 const data=policyStore.data[type];
 for(const input of policyControls.filter(e=>e.dataset.policy===type)){
  const key=input.dataset.field;
  input.disabled=!hasPolicy(type)||!data||policyStore.busy||(key==='ambient'||key==='darklow')&&boardCaps?.ambient!=='1';
  if(!data){if(input.type==='checkbox')input.checked=false;else input.value='';continue;}
  if(policyDirty[type].has(key))continue;
  if(input.type==='checkbox')input.checked=data[key]==='1';else input.value=input.type==='time'?policy.clock(data[key]):data[key];
 }
 $(type==='DAILY'?'saveDailyPolicy':'saveDisplayPolicy').disabled=!hasPolicy(type)||!data||policyStore.busy||!policyDirty[type].size||otaBusy;
}
for(const input of policyControls)input.addEventListener('input',()=>{const type=input.dataset.policy,key=input.dataset.field;policyDirty[type].add(key);policyDraft[type][key]=input.type==='checkbox'?(input.checked?1:0):input.value;policyFields(type);});
async function savePolicy(type){
 if(!hasPolicy(type)||policyBlocked())throw Error('当前不能保存，请等待传输结束并保持连接');
 if(!policyDirty[type].size)return;
 const epoch=policyEpoch,patch={},status=$(type==='DAILY'?'dailyStatus':'displayPolicyStatus');
 for(const key of policyDirty[type]){const input=policyControls.find(e=>e.dataset.policy===type&&e.dataset.field===key);patch[key]=input.type==='time'?policy.minute(policyDraft[type][key]):policyDraft[type][key];}
 status.textContent='正在读取硬件当前值并保存…';
 if(policyFlight)await policyFlight;
 if(epoch!==policyEpoch||policyBlocked())throw Error('连接或传输状态已变化，未保存设置');
 const promise=policyStore.save(type,patch);policyFields(type);
 try{await promise;if(epoch!==policyEpoch)return;policyDirty[type].clear();policyDraft[type]={};status.textContent='已保存，并回读确认硬件设置。';await refresh();}
 catch(e){if(epoch===policyEpoch)status.textContent=e.message;throw e;}
 finally{if(epoch===policyEpoch){policyFields(type);renderPolicyState();}}
}
$('saveDailyPolicy').addEventListener('click',()=>run(()=>savePolicy('DAILY')));
$('saveDisplayPolicy').addEventListener('click',()=>run(()=>savePolicy('DISPLAY')));
async function rereadPolicy(type){
 if(policyDirty[type].size&&!confirm('放弃尚未保存的修改，重新读取硬件设置？'))return;
 policyDirty[type].clear();policyDraft[type]={};await refreshPolicies(true);
}
$('readDailyPolicy').addEventListener('click',()=>run(()=>rereadPolicy('DAILY')));
$('readDisplayPolicy').addEventListener('click',()=>run(()=>rereadPolicy('DISPLAY')));
function renderPolicyState(){
 $('policyFirmwareVersions').textContent=`设备当前固件：${ready?(state.v||otaCurrent||'读取中'):'未连接'}`;
 if(!ready)return;
 const d=policyStore.data.DAILY;
 const job=policyJob&&policyJob.job===state.job?{...state,...policyJob}:state;
 if(boardCaps?.jobstate==='1'){
  const label=policy.task(job);$('workLabel').textContent=label;
  $('taskCard').hidden=job.stage==='idle'&&job.needhome!=='1'&&Number(state.timer||0)===0;
  $('taskTitle').textContent=label;$('taskDetail').textContent=job.needhome==='1'?'中止后先归位，再开始新绘制':job.busy==='1'?`${job.pct||0}% · 预计 ${job.eta||0} 秒`:job.stage==='complete'?'设备已确认完成':job.stage==='stopped'?'任务已中止，未继续执行':'';
  $('taskBar').value=Number(job.pct)||0;$('policyHome').hidden=job.needhome!=='1';$('policyHome').disabled=job.busy==='1'||otaBusy;
  for(const el of document.querySelectorAll('#drawTime,#drawDate,#sendDrawing,#startTimer,#startPomo,#drawFavorite,[data-pattern]'))el.disabled=job.needhome==='1'||otaBusy||uploading;
  if(timerDeadline&&Date.now()>=timerDeadline||state.task==='finished'||['timer','focus','rest'].includes(state.task)&&Number(state.timer)===0){
   $('timerStatus').textContent=job.stage==='homing'?'计时归零，机械臂归位中':job.stage==='complete'?'硬件已确认计时完成':job.stage==='stopped'?'计时已中止':job.stage==='error'?'计时任务异常':'计时归零，等待硬件确认下一阶段';
  }
 }
 const autoLabel=$('autoToggle').closest('label');autoLabel.querySelector('b').textContent=d?`自动绘时 · 每 ${d.every} 分钟`:'自动绘时';
 if(d){
  autoLabel.querySelector('small').textContent=policy.next(d,state);
  $('dailyNext').textContent=`有效时段：${d.from===d.to?'全天':policy.clock(d.from)+'—'+policy.clock(d.to)}。${policy.next(d,state)}`;
 }
 if(boardCaps?.daily==='1'){
  if(!policyStore.busy&&!policyDirty.DAILY.size)$('dailyStatus').textContent=policyReadError?'读取未完成：'+policyReadError:d?`硬件系统夜间模式：${d.night==='1'?'已开启':'已关闭'}${state.night==='1'?' · 当前生效':''}；声音免打扰独立设置。`:'正在读取硬件日常策略…';
 }
 if(policyLight){
  $('boardLight').textContent=policy.light(policyLight);
  $('lightPolicyState').textContent=`光敏自动策略${policyLight.automatic==='1'?'已开启':'未开启'}；灯带当前${policyLight.strip==='1'?'亮':'灭'}。${state.night==='1'?'系统夜间模式限制灯带。':''}当前固件未报告自动／手动覆盖的实际控制来源。`;
 }
 renderPolicySound();
}
function renderPolicySound(){
 $('policyQuiet').disabled=!ready||otaBusy;$('policyQuiet').checked=ready&&state.quiet==='1';
 if(!ready){$('soundStatus').textContent='未连接，声音状态未知';return;}
 const reasons=[];if(state.quiet==='1')reasons.push('全局静音');if(state.night==='1')reasons.push('系统夜间模式');
 if(policySound?.night==='1'){
  const hour=Number(clockFormat417.format(new Date()).split(':')[0]);
  if(state.clock==='1'&&policy.inside(hour,Number(policySound.from),Number(policySound.to)))reasons.push('声音免打扰（按手机北京时间估计）');
 }
 $('soundStatus').textContent=reasons.length?'静音原因：'+reasons.join('、'):state.buzz==='1'?'正在播放声音':`声音空闲${policySound?.night==='1'?'；声音免打扰已启用，当前是否生效未由硬件单独上报':''}`;
}
async function refreshPolicies(all=false){
 if(policyBlocked()||policyStore.busy||policyFlight)return policyFlight;
 const epoch=policyEpoch,route=activeTab;
 const work=(async()=>{
  try{
   if(!boardCaps)return;
   if(boardCaps.daily==='1')await policyStore.read('DAILY');
   if(epoch!==policyEpoch||policyBlocked())return;
   if(boardCaps.jobstate==='1'){const v=parseState(await command('JOBINFO'));if(epoch!==policyEpoch)return;policyJob=v;}
   if(epoch!==policyEpoch||policyBlocked())return;
   if(boardCaps.ambient==='1'&&(all||['environment','daily'].includes(route))){const v=parseState(await command('LIGHTINFO'));if(epoch!==policyEpoch)return;policyLight=v;}
   if(boardCaps.display==='1'&&(all||route==='display-settings'))await policyStore.read('DISPLAY');
   if(epoch!==policyEpoch||policyBlocked())return;
   if(all||route==='sound'){const v=parseState(await command('SOUNDINFO'));if(epoch!==policyEpoch)return;policySound=v;}
   if(epoch!==policyEpoch)return;
   policyReadError='';
   for(const type of ['DAILY','DISPLAY'])policyFields(type);
   if(!hasPolicy('DAILY'))$('dailyStatus').textContent='当前设备未提供日常策略接口，原有声音设置仍可使用。';
   $('displayPolicyStatus').textContent=hasPolicy('DISPLAY')?'已读取硬件基础设置；实际生效亮度未由硬件上报。':'当前设备未提供 OLED 设置接口。';
  }catch(e){if(epoch===policyEpoch){policyReadError=e.message;$('dailyStatus').textContent='读取未完成：'+e.message;$('displayPolicyStatus').textContent='读取未完成：'+e.message;}}
  finally{if(epoch===policyEpoch)renderPolicyState();}
 })();policyFlight=work;try{await work;}finally{if(policyFlight===work)policyFlight=null;}
}
Object.assign(errors,{ID_REUSED:'通信序号冲突，本次命令未执行。请重新连接后检查任务状态。',ALREADY_ACCEPTED:'设备已接受该指令，请查看任务状态，不要重复启动。',NIGHT_QUIET:'当前夜间策略限制此操作，请检查系统夜间模式和声音免打扰。'});
const policyCommand=command;
command=async function(name,args=''){
 const epoch=policyEpoch;
 const movement=['TIME','DATE','TEST','RUN','BEGIN','TIMER','POMO'];
 if(state.needhome==='1'&&(movement.includes(name)||name==='ACTION'&&['1','2','3'].includes(String(args))||name==='AUTO'&&String(args)==='1'))throw Error('需要先归位，请点击设备任务卡的“先归位”');
 try{return await policyCommand(name,args);}
 catch(e){
  if(name==='STRIP'&&e.message===errors.NIGHT_QUIET)throw Error('系统夜间模式正在限制灯带，请在日常策略中调整。');
  if([errors.NOT_READY,errors.BUSY,errors.ALREADY_ACCEPTED,errors.ID_REUSED].includes(e.message)&&ready){
   try{await policyCommand('GET');}catch(ignored){}
   if(epoch===policyEpoch){if(state.needhome==='1')throw Error('需要先归位，请点击设备任务卡的“先归位”');if(state.stage)throw Error(e.message+' 当前任务：'+policy.task(state));}
  }
  throw e;
 }
};
const policyBoardRender=renderBoard;renderBoard=function(){policyBoardRender();renderPolicyState();};
const policyDeviceRender=renderDevice412;renderDevice412=function(){policyDeviceRender();renderPolicyState();};
renderSoundStatus=renderPolicySound;
const policyTab=setTab;setTab=function(name){policyTab(name);if(['settings','daily','display-settings','environment','sound','control','timer'].includes(name))refreshPolicies(name==='settings');};
const policyEvent=window.onNativeEvent;
window.onNativeEvent=async event=>{
 if(event.type==='connection'){
  ++policyEpoch;policyStore.reset();policyFlight=null;policyReadError='';policyJob=policyLight=policySound=null;policyDirty.DAILY.clear();policyDirty.DISPLAY.clear();policyDraft.DAILY={};policyDraft.DISPLAY={};
  for(const type of ['DAILY','DISPLAY'])policyFields(type);
  if(event.state!=='ready'){$('dailyStatus').textContent=$('displayPolicyStatus').textContent='未连接，请连接后读取硬件设置。';$('lightPolicyState').textContent='未连接，光敏状态未知';$('policyQuiet').disabled=true;$('policyQuiet').checked=false;}
 }
 const epoch=policyEpoch;
 await policyEvent(event);
 if(epoch!==policyEpoch)return;
 if(event.type==='line'&&ready){
  const [,type,body]=event.line.split('|');
  if(type==='SOUND')policySound=parseState(body);
  if(type==='STATE'){policyStateAt=Date.now();policyJob=null;}
  if(type==='DONE'&&boardCaps?.jobstate==='1')refreshPolicies();
 }
 if(event.type==='connection'&&event.state==='ready'&&ready)await refreshPolicies(true);
 if(event.type==='appForeground'&&ready)await refreshPolicies(true);
 renderPolicyState();
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ready)refreshPolicies(true);});
setInterval(()=>{if(!document.hidden){renderPolicyState();if(!policyBlocked()&&requests.size===0&&['control','settings','daily','display-settings','environment','sound','timer'].includes(activeTab))refreshPolicies();}},5000);
for(const type of ['DAILY','DISPLAY'])policyFields(type);
