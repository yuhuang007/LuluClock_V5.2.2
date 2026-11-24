'use strict';
// All assets are local. BLE and font shaping are implemented by the Android bridge.
$('scanButton').insertAdjacentHTML('afterend','<button class="text-button" id="reconnect">重连上次设备</button>');
$('deviceStrip').insertAdjacentHTML('afterend','<div class="task-card" id="taskCard" hidden><div><b id="taskTitle">等待任务</b><span id="taskDetail"></span></div><progress id="taskBar" max="100" value="0"></progress><small>绘制时长为估算，以实际动作完成为准。</small></div>');
$('panel-control').insertAdjacentHTML('beforeend',`<div class="feature-card"><h2>描绘强度</h2><div class="presets"><button data-profile="2,1">快速</button><button data-profile="4,1">标准</button><button data-profile="15,2">深描</button></div><label class="form-row">重复描绘<select id="repeatCount"><option value="1">1 遍</option><option value="2">2 遍</option><option value="3">3 遍</option></select></label><button class="secondary full" id="saveProfile">保存速度与描绘遍数</button><p class="hint">速度和遍数断电保留。深描增加照射时间；倒计时刷新固定画一遍。</p></div>`);
$('panel-draw').insertAdjacentHTML('beforeend',`<div class="feature-card"><h2>编辑与文字</h2><div class="edit-grid"><button data-edit="smaller">缩小</button><button data-edit="larger">放大</button><button data-edit="left">←</button><button data-edit="right">→</button><button data-edit="up">↑</button><button data-edit="down">↓</button><button data-edit="center">居中</button></div><label class="form-row">短句<input id="textInput" maxlength="32" placeholder="例如 HELLO / 你好"></label><button class="secondary full" id="makeText">按笔顺生成文字并预览</button><p class="hint">汉字按内置笔顺逐笔绘制，折笔连续，换笔关灯。预览线宽约0.8毫米，实际粗细由灯头决定；想加强显色可在绘制设置中适当调慢速度。复杂中文建议1–4字。</p></div><div class="feature-card"><h2>图案收藏</h2><label class="form-row">图案名称<input id="favoriteName" maxlength="24" placeholder="为当前画布命名"></label><button class="secondary full" id="saveFavorite">收藏当前画布</button><div id="favoriteList"></div><button class="primary full" id="storeFavorite">同步画布为设备快捷图案</button><p class="hint" id="deviceFavoriteNote">手机最多收藏20幅；设备保存1幅、最多512点，用于三击和定时绘图。同步不立即绘制。</p><button class="text-button" id="drawFavorite">绘制设备快捷图案</button></div>`);
$('restoreCal').insertAdjacentHTML('beforebegin','<div class="compare-note" id="calCompare">连接后显示当前与已保存参数。</div><button class="secondary full" id="loadSavedCal">恢复设备已保存的校准值</button>');
$('panel-calibrate').insertAdjacentHTML('beforeend','<div class="feature-card"><h2>校准检查向导</h2><p id="wizardText">先检查装齿，再空走方框和十字，最后在纸上检查实绘。</p><button class="primary full" id="wizardNext">开始校准检查</button></div>');
$('panel-timer').insertAdjacentHTML('beforeend',`<button class="secondary full" id="saveTimerPreset">保存当前分钟数为按键预设</button><div class="feature-card"><h2>番茄钟循环</h2><label class="form-row">专注分钟<input id="pomoWork" type="number" min="1" max="99" value="25"></label><label class="form-row">休息分钟<input id="pomoRest" type="number" min="1" max="99" value="5"></label><label class="form-row">专注轮数<input id="pomoRounds" type="number" min="1" max="12" value="4"></label><p class="hint">每轮专注后休息，最后一轮专注结束即完成。阶段切换蜂鸣提示；离开手机继续运行，停止按钮取消整个循环。</p><button class="secondary full" id="savePomo">保存循环参数</button><button class="primary full" id="startPomo">保存并启动番茄钟</button></div>`);
document.querySelector('footer').insertAdjacentHTML('beforebegin',`<section id="panel-settings" class="panel"><div class="page-heading"><div class="eyebrow">YOUR CLOCK, YOUR WAY</div><h1>让时钟按你的习惯工作。</h1><p>按键、提示与计划保存在设备，离开手机也有效。</p></div><div class="feature-card"><h2>按键自定义</h2><div id="keyFields"></div><div class="action-grid compact"><button class="primary" id="saveKeys">保存按键</button><button class="secondary" id="defaultKeys">恢复默认按键</button></div><p class="hint">连击间隔约300ms。短长按1.5–5秒后松开；按满5秒重试已保存Wi-Fi。任务中按一下固定停止。装臂模式保持独立A/B操作。</p></div><div class="feature-card"><h2>整点提示</h2><label class="form-row">开启整点提示<input id="chimeToggle" type="checkbox"></label><label class="form-row">开始小时<input id="chimeFrom" type="number" min="0" max="23" value="8"></label><label class="form-row">结束小时<input id="chimeTo" type="number" min="0" max="23" value="22"></label><button class="secondary full" id="saveChime">保存整点提示</button><p class="hint">含起止整点，支持跨午夜；静音时不发声，需要已校时。</p></div><div class="feature-card"><h2>定时绘图与计时</h2><label class="form-row">允许执行计划和整点提示<input id="plansArmed" type="checkbox"></label><p class="hint">停止会暂停计划和整点提示，重新打开此开关后恢复。重启恢复已保存计划。需校时；忙碌时跳过，不补画。</p><div id="planFields"></div><p class="hint">北京时间；相同分钟最多启动一项，按编号优先。保存后需确认上方允许开关开启。</p></div><div class="feature-card"><h2>连接与设备</h2><div id="deviceInfo">连接后读取版本与状态。</div><button class="secondary full" id="refreshAll">重新读取全部设置</button><p class="hint">断连时手机发起的图案停止；按键或计划发起的动作、自动绘时、计时和番茄钟可独立运行。</p></div></section>`);
document.querySelector('footer').textContent='绘时钟 3.2 · 本地蓝牙连接 · 不上传数据';
const settingNav=document.createElement('button');settingNav.dataset.tab='settings';settingNav.innerHTML='<span>⚙</span>设置';settingNav.addEventListener('click',()=>setTab('settings'));document.querySelector('nav').append(settingNav);
const actions=['不操作','绘制时间','绘制日期','快捷图案','预设计时','切换自动绘时','切换静音','切换空走','回原点','方框','十字','椭圆','网格','爱心','番茄钟','声音提醒'];
for(let i=0;i<5;i++){
 const label=document.createElement('label');label.className='form-row';label.textContent=['单击','双击','三击','四击','短长按'][i];const select=document.createElement('select');select.id=`key${i}`;actions.forEach((name,id)=>select.add(new Option(name,id)));select.value=[1,2,3,4,5][i];label.append(select);$('keyFields').append(label);
}
for(let i=0;i<4;i++){
 const row=document.createElement('div');row.className='plan-item';row.innerHTML=`<h3>计划 ${i+1}</h3><label class="form-row">启用<input id="planEnabled${i}" type="checkbox"></label><label class="form-row">时间<input id="planTime${i}" type="time" value="09:00"></label><label class="form-row">执行<select id="planAction${i}"></select></label><div class="week-days" id="week${i}"></div><button class="secondary full" id="savePlan${i}">保存计划 ${i+1}</button>`;
 $('planFields').append(row);actions.forEach((name,id)=>{if([1,2,3,4,9,10,11,12,13,14,15].includes(id))$(`planAction${i}`).add(new Option(name,id));});
 for(let d=0;d<7;d++){const l=document.createElement('label');const input=document.createElement('input');input.type='checkbox';input.id=`day${i}-${d}`;input.checked=true;l.append(input,document.createTextNode(['日','一','二','三','四','五','六'][d]));$(`week${i}`).append(l);}
 $(`savePlan${i}`).addEventListener('click',()=>run(async()=>{const [h,m]=$(`planTime${i}`).value.split(':').map(Number);let days=0;for(let d=0;d<7;d++)if($(`day${i}-${d}`).checked)days|=1<<d;if(!days||!Number.isInteger(h)||!Number.isInteger(m))throw new Error('请选择有效时间和至少一天');await command('PLAN',`${i},${$(`planEnabled${i}`).checked?1:0},${h},${m},${days},${$(`planAction${i}`).value}`);},`计划 ${i+1} 已保存`));
}
let deviceConfig={},configLoading=false;
function integer(id,min,max){const n=Number($(id).value);if(!Number.isInteger(n)||n<min||n>max)throw new Error(`请检查 ${$(id).closest('label')?.childNodes[0]?.textContent||id} 的范围`);return n;}
function applyConfig(cfg){
 deviceConfig=cfg;$('repeatCount').value=cfg.repeat||1;
 for(let i=0;i<5;i++)$(`key${i}`).value=cfg[`k${i}`]??[1,2,3,4,5][i];
 $('pomoWork').value=cfg.work||25;$('pomoRest').value=cfg.rest||5;$('pomoRounds').value=cfg.rounds||4;
 $('chimeToggle').checked=cfg.chime==='1';$('chimeFrom').value=cfg.from??8;$('chimeTo').value=cfg.to??22;
 $('deviceFavoriteNote').textContent=`设备快捷图案：${cfg.fav||0} 点。最多512点，断电保留；手机收藏最多20幅。`;
 compareCal();
}
function compareCal(){const fields=['slz','sls','srz','srs'];$('calCompare').textContent=fields.map((k,i)=>`${['左零点','左比例','右零点','右比例'][i]}：当前 ${$(k).value} / 已保存 ${deviceConfig['saved'+k]||'—'}`).join('\n');}
async function refreshConfig(){
 if(configLoading||!ready)return;configLoading=true;
 try{applyConfig(parseState(await command('CONFIG')));for(let i=0;i<4;i++){if(!ready)break;const p=parseState(await command('GETPLAN',i));$(`planEnabled${i}`).checked=p.enabled==='1';$(`planTime${i}`).value=`${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`;$(`planAction${i}`).value=p.action;for(let d=0;d<7;d++)$(`day${i}-${d}`).checked=!!(Number(p.days)&1<<d);}}
 finally{configLoading=false;}
}
const oldNativeEvent=window.onNativeEvent;
window.onNativeEvent=async event=>{
 await oldNativeEvent(event);
 if(event.type==='connection'&&event.state==='ready'){try{if(Number(state.v)<3){toast('请先升级到 v3 固件再使用新增功能');return;}await refreshConfig();}catch(error){toast(error.message);}}
 if(event.type==='connection'&&event.state==='disconnected'){$('taskCard').hidden=true;}
 if(event.type==='phase')$('connectionLabel').textContent=event.message;
 if(event.type==='error'){$('scanButton').disabled=false;$('scanNote').textContent=event.message;}
 if(event.type==='line'){
  const parts=event.line.split('|');
  if(parts[1]==='STATE'){
   $('plansArmed').checked=state.armed==='1';$('taskCard').hidden=!ready;
   const names={time:'绘制时间',date:'绘制日期',pattern:'绘制测试轨迹',drawing:'绘制手机图案',favorite:'绘制快捷图案',home:'回原点',focus:'专注中',rest:'休息中',timer:'倒计时',finished:'计时完成',stopped:'已停止',idle:'等待任务',fault:'轨迹或输出异常',favorite_saved:'快捷图案已保存'};
   $('taskTitle').textContent=names[state.task]||state.task||'等待任务';
   $('taskBar').value=Number(state.pct)||0;
   $('taskDetail').textContent=state.busy==='1'?`${state.pct}% · 第${state.pass}遍 · 约${state.eta}秒`:'动作空闲';
   $('deviceInfo').textContent=`固件 ${state.v||'—'}\n空闲堆 ${Math.round(Number(state.heap||0)/1024)} KiB，最低 ${Math.round(Number(state.minheap||0)/1024)} KiB\n模式 ${state.mode}，时钟${state.clock==='1'?'已校时':'未校时'}\n启动自动绘时：${deviceConfig.savedauto==='1'?'开':'关'}；当前计划${state.armed==='1'?'允许运行':'暂停'}`;
   if(Number(state.phase)>0)$('timerStatus').textContent=`${state.phase==='1'?'专注':'休息'} · 第 ${state.cycle}/${deviceConfig.rounds||'?'} 轮`;
   compareCal();
  }
  if(parts[1]==='DONE'&&parts[2]==='motion'){toast('机械动作已完成');refresh().catch(()=>{});}
  if(parts[1]==='NOTICE'){const notes={rest:'进入休息阶段',focus:'开始下一轮专注',schedule_started:'定时任务已启动',schedule_skipped:'计划到时，设备忙碌，已跳过',schedule_failed:'计划执行失败，请检查校时或快捷图案'};toast(notes[parts[2]]||parts[2]);}
 }
};
$('reconnect').addEventListener('click',()=>{if(native?.reconnect){$('connectionLabel').textContent='重新连接中';native.reconnect();}else toast('请在安卓App中重连设备');});
$('refreshAll').addEventListener('click',()=>run(async()=>{await refresh();await refreshConfig();},'已读取全部设置'));
async function profile(ms,repeats){await command('PROFILE',`${ms},${repeats}`);await refresh();applyConfig(parseState(await command('CONFIG')));}
for(const b of document.querySelectorAll('[data-profile]'))b.addEventListener('click',()=>run(()=>profile(...b.dataset.profile.split(',').map(Number)),'描绘设置已保存'));
$('saveProfile').addEventListener('click',()=>run(()=>profile(integer('speed',2,20),integer('repeatCount',1,3)),'速度与遍数已保存'));
$('saveKeys').addEventListener('click',()=>run(async()=>{await command('KEYS',Array.from({length:5},(_,i)=>$(`key${i}`).value).join(','));},'按键映射已保存'));
$('defaultKeys').addEventListener('click',()=>run(async()=>{await command('DEFAULTKEYS');applyConfig(parseState(await command('CONFIG')));},'已恢复默认按键'));
$('saveChime').addEventListener('click',()=>run(async()=>{await command('CHIME',`${$('chimeToggle').checked?1:0},${integer('chimeFrom',0,23)},${integer('chimeTo',0,23)}`);},'整点提示已保存'));
$('plansArmed').addEventListener('change',()=>run(async()=>{try{await command('ARM',$('plansArmed').checked?1:0);}finally{await refresh();}},'计划运行状态已更新'));
$('saveTimerPreset').addEventListener('click',()=>run(()=>command('TIMERPRE',integer('timerMinutes',1,99)),'按键计时预设已保存'));
async function savePomo(){await command('POMOCFG',`${integer('pomoWork',1,99)},${integer('pomoRest',1,99)},${integer('pomoRounds',1,12)}`);deviceConfig.work=$('pomoWork').value;deviceConfig.rest=$('pomoRest').value;deviceConfig.rounds=$('pomoRounds').value;}
$('savePomo').addEventListener('click',()=>run(savePomo,'番茄钟参数已保存'));
$('startPomo').addEventListener('click',()=>run(async()=>{await savePomo();await command('POMO');await refresh();},'番茄钟已启动'));
for(const id of ['slz','sls','srz','srs']){
 const tools=document.createElement('div');tools.className='nudge';
 for(const amount of [-5,-1,1,5]){const b=document.createElement('button');b.textContent=amount>0?`+${amount}`:String(amount);b.type='button';b.setAttribute('aria-label',`${id} ${b.textContent}`);b.addEventListener('click',event=>{event.preventDefault();const input=$(id);input.value=Math.max(Number(input.min),Math.min(Number(input.max),Number(input.value)+amount));calDirty=true;compareCal();scheduleLiveCal();});tools.append(b);}
 $(id).parentElement.append(tools);$(id).addEventListener('input',compareCal);
}

let wizardStep=0;
const wizardLabels=['进入安装模式并保持A位','检查B位','退出安装模式','灭灯走方框','灭灯走十字','完成检查'];
$('wizardNext').addEventListener('click',()=>run(async()=>{
 cancelLiveCal();
 if(wizardStep===0){if(!confirm('进入A位会移动机械臂，请确认周围无障碍。'))return false;await command('INSTALL');}
 else if(wizardStep===1)await command('POSE',1);
 else if(wizardStep===2)await command('EXIT');
 else if(wizardStep===3){await command('DRY',1);await command('TEST',0);}
 else if(wizardStep===4)await command('TEST',1);
 else {wizardStep=0;$('wizardText').textContent='空走检查已结束。确认灯与纸匹配后，在控制页关闭空走并实绘方框；有误差时回安装模式微调。';$('wizardNext').textContent='重新检查';return;}
 wizardStep++;$('wizardNext').textContent=wizardLabels[wizardStep]||'完成检查';$('wizardText').textContent=`步骤 ${wizardStep}/5：${['核对左臂水平、右臂竖直，然后检查B位。','核对左臂竖直、右臂水平，然后退出归位。','等待归位完成，再开始空走方框。','等待方框动作完成，再空走十字。','等待十字动作完成后结束。'][wizardStep-1]}`;await refresh();
}));
let favorites=[];
function validStrokes(value){return Array.isArray(value)&&value.length<=200&&value.every(s=>Array.isArray(s)&&s.length<=5000&&s.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=6&&p.x<=72&&p.y>=9&&p.y<=36));}
try{const saved=JSON.parse(localStorage.getItem('clockFavorites')||'[]');if(Array.isArray(saved))favorites=saved.filter(f=>f&&typeof f.name==='string'&&validStrokes(f.strokes)).slice(0,20);}catch(ignored){}
function saveFavorites(){localStorage.setItem('clockFavorites',JSON.stringify(favorites));renderFavorites();}
function renderFavorites(){
 $('favoriteList').replaceChildren();
 favorites.forEach((f,index)=>{
  const row=document.createElement('div');row.className='favorite-item';const title=document.createElement('b');title.textContent=f.name;const buttons=document.createElement('div');buttons.className='actions';
  for(const [label,fn] of [['载入',()=>{if(uploading)return;strokes=JSON.parse(JSON.stringify(f.strokes));saveDrawing();renderCanvas();$('favoriteName').value=f.name;setTab('draw');} ],['改名',()=>{const name=prompt('图案名称',f.name);if(name?.trim()){f.name=name.trim().slice(0,24);saveFavorites();}}],['删除',()=>{if(confirm(`删除收藏“${f.name}”？`)){favorites.splice(index,1);saveFavorites();}}]]){const b=document.createElement('button');b.textContent=label;b.addEventListener('click',()=>run(async()=>fn()));buttons.append(b);}
  row.append(title,buttons);$('favoriteList').append(row);
 });
}
$('saveFavorite').addEventListener('click',()=>run(async()=>{const name=$('favoriteName').value.trim();if(!name)throw new Error('请给图案命名');const points=flattenDrawing();if(points.length<2||points.length>2048)throw new Error('请先画2–2048点的图案');if(favorites.length>=20)throw new Error('收藏已满20幅，请先删除一幅');favorites.push({name:name.slice(0,24),strokes:strokes.map(s=>simplify(s,.12))});saveFavorites();},'已收藏到手机'));
for(const b of document.querySelectorAll('[data-edit]'))b.addEventListener('click',()=>run(async()=>{
 if(uploading)throw new Error('上传中不能编辑');if(!strokes.length)return;const bounds=strokes.flat().reduce((b,p)=>({minX:Math.min(b.minX,p.x),maxX:Math.max(b.maxX,p.x),minY:Math.min(b.minY,p.y),maxY:Math.max(b.maxY,p.y)}),{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity});const {minX,maxX,minY,maxY}=bounds,cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 const type=b.dataset.edit,scale=type==='smaller'?.85:type==='larger'?1.15:1,dx=type==='left'?-1:type==='right'?1:type==='center'?39-cx:0,dy=type==='up'?1:type==='down'?-1:type==='center'?22.5-cy:0;
 const next=strokes.map(s=>s.map(p=>({x:cx+(p.x-cx)*scale+dx,y:cy+(p.y-cy)*scale+dy})));
 if(!validStrokes(next))throw new Error('已到绘制区域边缘，请先缩小或居中');strokes=next;saveDrawing();renderCanvas();
}));
$('makeText').addEventListener('click',()=>run(async()=>{
 if(uploading)throw new Error('上传中不能编辑');if(!native?.textPaths)throw new Error('单线文字需在安卓App中生成');const text=$('textInput').value.trim();if(!text||[...text].length>16)throw new Error('请输入1–16个字符');const result=HanziText.generate(text,t=>JSON.parse(native.textPaths(t)));if(result.error)throw new Error(result.error);if(!validStrokes(result.strokes))throw new Error('单线文字无效');const next=result.strokes.map(s=>simplify(s,.12));if(next.reduce((n,s)=>n+s.length,0)>2048)throw new Error('文字超过2048点，请减少字数');strokes=next;saveDrawing();renderCanvas();setTab('draw');
},'单线文字已生成，请检查预览'));
$('storeFavorite').addEventListener('click',()=>run(()=>uploadDrawing('STORE')));
$('drawFavorite').addEventListener('click',()=>run(()=>command('ACTION',3),'快捷图案指令已接受'));
renderFavorites();
Object.assign(errors,{NO_FAVORITE:'请先同步一幅设备快捷图案',FAVORITE_LIMIT:'设备快捷图案最多512点，请简化',BAD_VERSION:'请先升级v3固件'});
document.addEventListener('click',event=>{
 const otaControl=typeof otaBusy!=='undefined'&&otaBusy&&event.target.closest('#otaCancel,#otaCheck');
 const viewControl=event.target.closest('nav,.menu-row,.back-button,#deviceAbout,#calBack,#homeVersion,#themeToggle,button[data-appearance],#tabletSections button,#motionPreference');
 if(uploading&&!otaControl&&!viewControl&&event.target.closest('button,input,select')&&!event.target.closest('#emergencyStop')){event.preventDefault();event.stopImmediatePropagation();toast('正在上传；可以使用停止按钮取消');}
},true);

$("textInput").parentElement.insertAdjacentHTML("afterend",`<details><summary>汉字数据与许可</summary><p>Make Me a Hanzi · Copyright (C) 1999 Arphic Technology Co., Ltd. 数据无担保，可按 Arphic Public License 复制、修改和再分发。</p><pre id="hanziLicense" style="white-space:pre-wrap;max-height:240px;overflow:auto"></pre></details>`);
$("hanziLicense").textContent=HanziText.license;
