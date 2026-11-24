'use strict';
const $=id=>document.getElementById(id);
const native=window.ClockNative;
let ready=false,sequence=1,state={},calDirty=false,uploading=false,uploadCancelled=false;
let currentDevice={name:'',address:'',code:''};
let timerDeadline=0,timerFinished=false,toastTimer=0,activeTab='control';
const requests=new Map();
const errors={BAD_FRAME:'消息格式错误',BAD_TIME:'手机时间超出支持范围',BAD_VALUE:'设置值无效',BAD_SPEED:'速度应在 2–20 ms 之间',QUIET:'当前为静音模式',PWM_FAILED:'蜂鸣器初始化失败',NOT_READY:'请先校时，或等待当前任务结束',BAD_POSE:'姿态参数无效',INSTALL_FIRST:'请先进入装臂调试',POSE_FAILED:'定位失败，请检查校准参数',BAD_CAL:'校准参数格式或范围错误',UNREACHABLE:'轨迹不可达或舵机脉宽超限，请检查校准值',BAD_WIFI:'Wi-Fi名称须为1–32字节，密码须为8–63字节；开放网络请勾选无密码',SAVE_FAILED:'参数保存失败',HOME_FAILED:'无法归位，请检查校准值',BUSY:'时钟正忙，请先停止当前任务',DRY_RUN:'当前为灭灯空走，请先关闭空走模式',NO_UPLOAD:'上传已取消，请重新发送',BAD_POINTS:'图案坐标超出绘制区域',BAD_OFFSET:'图案顺序错误，请重新发送',TOO_MANY:'图案点数超限',INCOMPLETE:'图案未传输完整',BAD_TIMER:'倒计时应在 1–99 分钟之间',UPLOAD_TIMEOUT:'上传超时，本次图案已丢弃',UNKNOWN_COMMAND:'设备不支持这个命令'};
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
function rejectRequests(reason){for(const request of requests.values()){clearTimeout(request.timeout);request.reject(new Error(reason));}requests.clear();}
function command(name,args=''){
  if(!ready)return Promise.reject(new Error('请先连接时钟'));
  const id=sequence++;if(sequence>999999)sequence=1;
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{requests.delete(id);reject(new Error('设备响应超时，请停止后重新连接'));},['RUN','STORE','CAL'].includes(name)?60000:12000);
    requests.set(id,{resolve,reject,timeout});
    native.send(`${id}|${name}|${args}`);
  });
}
async function run(action,message){try{const result=await action();if(message&&result!==false)toast(message);}catch(error){toast(error.message);} }
function refresh(){return command('GET');}
function parseState(text){const result={};for(const pair of text.split(',')){const i=pair.indexOf('=');if(i>0)result[pair.slice(0,i)]=pair.slice(i+1);}return result;}
function renderState(next){
  state={...state,...next};
  $('modePill').textContent=state.dry==='1'?'灭灯空走':'实绘模式';
  $('modePill').style.color=state.dry==='1'?'':'#ffe1b5';
  $('dryToggle').checked=state.dry==='1';$('quietToggle').checked=state.quiet==='1';$('autoToggle').checked=state.auto==='1';
  if(document.activeElement!==$('speed')){$('speed').value=state.step||4;$('speedValue').textContent=state.step||4;}
  $('resourceLabel').textContent=state.heap?`空闲内存 ${Math.round(Number(state.heap)/1024)} KB`:'已连接';
  $('workLabel').textContent=state.fault==='1'?'校准或轨迹异常':Number(state.total)>0?'正在接收图案':state.mode==='install'?'保持安装位置':state.busy==='1'?'正在绘制':state.auto==='1'?'每分钟自动绘制':'等待指令';
  $('installStatus').textContent=state.mode==='install'?'调试模式中':'未进入';
  if(!calDirty)for(const id of ['slz','sls','srz','srs'])if(state[id])$(id).value=state[id];
  const seconds=Number(state.timer||0);
  if(seconds>0){timerDeadline=Date.now()+seconds*1000;timerFinished=false;$('timerStatus').textContent='时钟独立计时中';}
  else if(timerDeadline){timerDeadline=0;timerFinished=true;$('timerStatus').textContent='已结束或停止';}
}
window.onNativeEvent=async event=>{
  if(event.type==='device'){
    const key=event.address.replace(/:/g,'');let button=$(`device-${key}`);
    if(!button){button=document.createElement('button');button.id=`device-${key}`;button.addEventListener('click',()=>{$('connectionLabel').textContent='连接中';native.connect(event.address);});$('deviceList').append(button);}
    button.textContent=DeviceIdentityUI.scan(event);
  }else if(event.type==='scan'){
    const active=event.active==='1';$('scanButton').disabled=active;
    $('scanNote').textContent=active?'正在扫描附近的 小噜蓝牙时钟…':'扫描结束。未找到时，请确认时钟已开机且固件支持蓝牙、蓝牙已开启。旧版安卓还需开启系统定位。';
  }else if(event.type==='connection'){
    state={};calDirty=false;
    for(const id of ['slz','sls','srz','srs']){$(id).value='';$(id).placeholder=event.state==='ready'?'读取中…':'未读取';}
    currentDevice=event.state==='ready'||event.state==='connecting'?{name:DeviceIdentityUI.name(event.name),address:event.address||'',code:DeviceIdentityUI.fromName(event.name)}:{name:'',address:'',code:''};
    ready=event.state==='ready';
    $('connectionLabel').textContent=ready?'已连接':event.state==='connecting'?'连接中':'连接时钟';
    $('connectionDot').classList.toggle('connected',ready);$('connectCard').hidden=ready;$('deviceStrip').hidden=!ready;
    if(ready){if(typeof otaRecoveryPending==='undefined'||!otaRecoveryPending)toast('已连接 '+currentDevice.name);try{await refresh();await command('SYNC',Math.floor(Date.now()/1000));await refresh();}catch(error){if(typeof otaRecoveryPending==='undefined'||!otaRecoveryPending)toast(error.message);}}
    else{uploadCancelled=true;rejectRequests('蓝牙已断开');$('scanButton').disabled=false;$('workLabel').textContent='等待连接';$('modePill').textContent='待连接';}
  }else if(event.type==='line'){
    const match=/^(\d+)\|([A-Z]+)\|(.*)$/.exec(event.line);if(!match)return;
    const id=Number(match[1]),type=match[2],body=match[3];
    if(type==='STATE'&&ready)renderState(parseState(body));
    const request=requests.get(id);
    if(request){clearTimeout(request.timeout);requests.delete(id);if(type==='ERR')request.reject(new Error(errors[body]||body));else request.resolve(body);}
    else if(type==='ERR')toast(errors[body]||body);
    else if(type==='DONE' && body==='timer'){timerDeadline=0;timerFinished=true;$('timerStatus').textContent='倒计时完成';$('timerClock').textContent='00:00';toast('倒计时完成');}
  }else if(event.type==='error'){toast(event.message);}
};
function setTab(name){activeTab=name;document.querySelectorAll('.panel').forEach(panel=>panel.classList.toggle('active',panel.id===`panel-${name}`));document.querySelectorAll('nav button').forEach(button=>button.classList.toggle('active',button.dataset.tab===name));window.scrollTo(0,0);if(name==='draw')renderCanvas();}
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.tab)));
$('scanButton').addEventListener('click',()=>{if(!native){toast('此预览没有蓝牙，请在安卓 App 中连接');return;}$('deviceList').replaceChildren();native.scan();});
$('connectionButton').addEventListener('click',()=>{if(ready){
 const comparison=typeof otaVersionCompare==='function'?otaVersionCompare(state.v,'4.1.19'):null;
 const description=comparison!==null&&comparison>=0?'断开蓝牙？已完整接收并接受的绘制会继续，未传完的图案会取消；倒计时继续。停止任务请使用“停止”按钮。':'断开蓝牙？任务是否继续取决于设备固件。本次不会主动发送停止指令；需要停止任务，请使用“停止”按钮。';
 if(confirm(description)){window.connectionMotion?.expectDisconnect();native.disconnect();}
 }else{$('connectCard').hidden=false;window.scrollTo(0,0);}});
$('drawTime').addEventListener('click',()=>run(()=>command('TIME'),'时间指令已接受'));
$('drawDate').addEventListener('click',()=>run(()=>command('DATE'),'日期指令已接受'));
$('syncTime').addEventListener('click',()=>run(async()=>{await command('SYNC',Math.floor(Date.now()/1000));await refresh();},'已同步手机时间'));
$('home').addEventListener('click',()=>run(()=>command('HOME'),'正在回到原点'));
$('lightTest').addEventListener('click',()=>run(()=>command('LED',1),'绘制灯将亮 10 秒'));
$('beepTest').addEventListener('click',()=>run(()=>command('BEEP'),'播放三声提示音'));
for(const [id,name] of [['dryToggle','DRY'],['autoToggle','AUTO'],['quietToggle','QUIET']])$(id).addEventListener('change',()=>run(async()=>{try{await command(name,$(id).checked?1:0);}finally{if(ready)await refresh();}}));
$('speed').addEventListener('input',()=>$('speedValue').textContent=$('speed').value);
$('speed').addEventListener('change',()=>run(()=>command('SPEED',$('speed').value)));
document.querySelectorAll('[data-pattern]').forEach(button=>button.addEventListener('click',()=>run(()=>command('TEST',button.dataset.pattern),'轨迹指令已接受')));
function stop(){uploadCancelled=true;rejectRequests('已停止');if(native)native.stop();timerDeadline=0;timerFinished=true;$('timerStatus').textContent='已停止';$('workLabel').textContent='正在停止';toast('已发送停止指令');}
$('emergencyStop').addEventListener('click',stop);
let strokes=[],currentStroke=null;
try{const saved=JSON.parse(localStorage.getItem('clockDrawing')||'[]');if(Array.isArray(saved)&&saved.length<=200 && saved.every(s=>Array.isArray(s)&&s.length<=5000&&s.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=6&&p.x<=72&&p.y>=9&&p.y<=36)))strokes=saved;}catch(ignored){}
const canvas=$('drawingCanvas'),context=canvas.getContext('2d');
function renderCanvas(){
  const w=canvas.width,h=canvas.height;context.clearRect(0,0,w,h);
  const canvasPalette=getComputedStyle(canvas);
  context.strokeStyle=canvasPalette.getPropertyValue('--canvas-grid').trim()||'#e3e9da';context.lineWidth=1;
  for(let x=0;x<=w;x+=w/22){context.beginPath();context.moveTo(x,0);context.lineTo(x,h);context.stroke();}
  for(let y=0;y<=h;y+=h/9){context.beginPath();context.moveTo(0,y);context.lineTo(w,y);context.stroke();}
  context.lineWidth=12;context.lineCap='round';context.lineJoin='round';context.strokeStyle=canvasPalette.getPropertyValue('--canvas-ink').trim()||'#305648';
  for(const stroke of strokes){if(!stroke.length)continue;context.beginPath();stroke.forEach((p,i)=>{const x=(p.x-6)/66*w,y=(36-p.y)/27*h;if(i===0)context.moveTo(x,y);else context.lineTo(x,y);});context.stroke();}
  $('pointCount').textContent=`${flattenDrawing().length} 点`;
}
function pointer(event){const rect=canvas.getBoundingClientRect();return{x:6+Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))*66,y:36-Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))*27};}
canvas.addEventListener('pointerdown',event=>{if(uploading)return;event.preventDefault();canvas.setPointerCapture(event.pointerId);currentStroke=[pointer(event)];strokes.push(currentStroke);renderCanvas();});
canvas.addEventListener('pointermove',event=>{if(!currentStroke||uploading)return;event.preventDefault();const p=pointer(event),last=currentStroke[currentStroke.length-1];if(Math.hypot(p.x-last.x,p.y-last.y)>=.18 && currentStroke.length<5000){currentStroke.push(p);renderCanvas();}});
function finishStroke(){if(currentStroke){if(currentStroke.length<2)strokes.pop();currentStroke=null;saveDrawing();renderCanvas();}}
canvas.addEventListener('pointerup',finishStroke);canvas.addEventListener('pointercancel',finishStroke);
function saveDrawing(){try{localStorage.setItem('clockDrawing',JSON.stringify(strokes));}catch(ignored){}}
function simplify(points,tolerance=.3){
  if(points.length<=2)return points;
  // Iterative Douglas-Peucker avoids stack exhaustion on long finger strokes.
  const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;const stack=[[0,points.length-1]];
  while(stack.length){const [a,b]=stack.pop(),p=points[a],q=points[b];let best=tolerance*tolerance,index=-1;
    for(let i=a+1;i<b;i++){const r=points[i],dx=q.x-p.x,dy=q.y-p.y,length=dx*dx+dy*dy;let t=length?((r.x-p.x)*dx+(r.y-p.y)*dy)/length:0;t=Math.max(0,Math.min(1,t));const d=(r.x-p.x-t*dx)**2+(r.y-p.y-t*dy)**2;if(d>best){best=d;index=i;}}
    if(index>=0){keep[index]=1;stack.push([a,index],[index,b]);}
  }
  return points.filter((p,i)=>keep[i]);
}
function flattenDrawing(){const points=[];for(const stroke of strokes){if(stroke.length<2)continue;simplify(stroke,.12).forEach((p,i)=>points.push({x:Math.round(p.x*100),y:Math.round(p.y*100),lit:i?1:0}));}return points;}
$('undoDrawing').addEventListener('click',()=>{if(uploading)return;strokes.pop();saveDrawing();renderCanvas();});
$('clearDrawing').addEventListener('click',()=>{if(uploading)return;strokes=[];saveDrawing();renderCanvas();});
async function uploadDrawing(finalCommand='RUN'){
  if(uploading)throw new Error('正在上传，请稍候');const points=flattenDrawing();
  if(points.length<2)throw new Error('请先画至少一条线');if(points.length>2048)throw new Error('图案超过 2048 点，请简化后重试');
  if(finalCommand==='STORE'&&points.length>512)throw new Error('设备快捷图案限512点，请简化后重试');
  uploading=true;uploadCancelled=false;$('sendDrawing').disabled=true;$('uploadProgress').hidden=false;
  let uploadBegan=false,finalSent=false;
  try{await command('BEGIN',points.length);uploadBegan=true;
    for(let offset=0;offset<points.length;offset+=8){if(uploadCancelled)throw new Error('图案上传已取消');const batch=points.slice(offset,offset+8).map(p=>`${p.x},${p.y},${p.lit}`).join(';');await command('PTS',`${offset};${batch}`);const percent=Math.round(Math.min(offset+8,points.length)/points.length*100);$('uploadBar').value=percent;$('uploadLabel').textContent=`已传输 ${percent}%`;}
    if(uploadCancelled)throw new Error('图案上传已取消');finalSent=true;await command(finalCommand);$('uploadLabel').textContent=finalCommand==='STORE'?'快捷图案已保存到设备':'图案已校验，开始绘制';toast(finalCommand==='STORE'?'设备快捷图案已保存':'开始绘制你的图案');if(finalCommand==='STORE'&&typeof refreshConfig==='function')await refreshConfig();
  }catch(error){if(ready&&!uploadCancelled&&uploadBegan&&!finalSent){try{await command('ABORT');}catch(ignored){}}if(finalSent){$('uploadLabel').textContent='已发送最终指令，正在核对硬件任务状态；不会自动重发或停止。';if(ready)refresh().catch(()=>{});}throw error;}
  finally{uploading=false;$('sendDrawing').disabled=false;}
}
$('sendDrawing').addEventListener('click',()=>run(()=>uploadDrawing('RUN')));
document.querySelectorAll('[data-minutes]').forEach(button=>button.addEventListener('click',()=>{$('timerMinutes').value=button.dataset.minutes;if(!timerDeadline)timerFinished=false;document.querySelectorAll('[data-minutes]').forEach(b=>b.classList.toggle('selected',b===button));updateClocks();}));
$('timerMinutes').addEventListener('input',()=>{if(!timerDeadline)timerFinished=false;updateClocks();});
$('startTimer').addEventListener('click',()=>run(async()=>{const minutes=Number($('timerMinutes').value);if(!Number.isInteger(minutes)||minutes<1||minutes>99)throw new Error('请输入 1–99 分钟');await command('TIMER',minutes*60);timerFinished=false;timerDeadline=Date.now()+minutes*60000;$('timerStatus').textContent='时钟独立计时中';},'倒计时已开始'));
const clockFormat417=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false});
const dayFormat417=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric',weekday:'short'});
function updateClocks(){
  if(document.hidden)return;
  const date=new Date(),parts=clockFormat417.format(date).split(':');
  if($('phoneClock').textContent!==parts.join(':')){$('phoneClock').replaceChildren(document.createTextNode(parts[0]));const colon=document.createElement('span');colon.textContent=':';$('phoneClock').append(colon,document.createTextNode(parts[1]));}
  const day=dayFormat417.format(date);if($('todayLabel').textContent!==day)$('todayLabel').textContent=day;
  const seconds=timerDeadline?Math.max(0,Math.ceil((timerDeadline-Date.now())/1000)):timerFinished?0:Math.max(0,Math.min(99,Number($('timerMinutes').value)||0))*60;
  const timer=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;if($('timerClock').textContent!==timer)$('timerClock').textContent=timer;
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateClocks();});
setInterval(updateClocks,1000);setInterval(()=>{if(!document.hidden&&ready&&!uploading&&!otaBusy&&requests.size===0)refresh().catch(error=>toast(error.message));},5000);
updateClocks();renderCanvas();
// Pure helpers are exposed only to offline regression tests, not to native privileges.
window.ClockTest={simplify,flattenDrawing,parseState};
