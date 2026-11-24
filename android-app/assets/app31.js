'use strict';
// Wi-Fi configuration travels over BLE as hex-encoded UTF-8, including Chinese SSIDs.
$('panel-settings').querySelector('.page-heading').insertAdjacentHTML('afterend',`<div class="feature-card" id="wifiCard"><h2>Wi-Fi 配网</h2><p class="hint">先通过蓝牙连接时钟，再填写2.4GHz网络。手机保持原来的网络即可。</p><div id="wifiStatus" role="status">连接时钟后读取网络状态。</div><label class="form-row">Wi-Fi 名称<input id="wifiSsid" autocomplete="off" placeholder="填写完整名称，区分大小写"></label><label class="form-row">Wi-Fi 密码<input id="wifiPassword" type="password" autocomplete="new-password" placeholder="重新输入密码"></label><label class="form-row">显示密码<input id="showWifiPassword" type="checkbox"></label><label class="form-row">无密码的开放网络<input id="wifiOpen" type="checkbox"></label><button class="primary full" id="saveWifi">保存并连接 Wi-Fi</button><button class="secondary full" id="retryWifi">重试已保存网络</button><button class="text-button" id="forgetWifi">删除设备保存的 Wi-Fi</button><button class="text-button" id="readWifi">刷新网络状态</button><p class="hint">连接结果会自动更新。配网不重启；校时后按自动绘时设置运行，并关闭Wi-Fi省电。密码不回显，留空不表示保留旧密码。</p></div>`);
const wifiLabels={unconfigured:'未配置，等待 App 配网',connecting:'正在连接路由器…',syncing:'路由器已连接，正在网络校时…',synced:'网络校时成功，Wi-Fi已关闭省电',connect_failed:'连接失败：检查名称、密码及2.4GHz网络后重试',sync_failed:'路由器已连接，但网络校时超时；检查互联网连接后重试',paused:'已暂停联网，可重试'};
let wifiEditing=false;
function wifiHex(value){return Array.from(new TextEncoder().encode(value),b=>b.toString(16).padStart(2,'0')).join('');}
function wifiText(value){if(!/^(?:[0-9a-f]{2})*$/i.test(value||''))return '';return new TextDecoder().decode(Uint8Array.from((value||'').match(/../g)||[],b=>parseInt(b,16)));}
function renderWifi(cfg){
 const name=wifiText(cfg.ssid);$('wifiStatus').textContent=`${wifiLabels[cfg.status]||cfg.status||'等待状态'}${name?'\n设备网络：'+name:''}${cfg.ip?'\n地址：'+cfg.ip:''}`;
 if(!wifiEditing)$('wifiSsid').value=name;
}
async function readWifi(){renderWifi(parseState(await command('WIFIINFO')));}
$('wifiSsid').addEventListener('input',()=>wifiEditing=true);
$('showWifiPassword').addEventListener('change',()=>$('wifiPassword').type=$('showWifiPassword').checked?'text':'password');
$('wifiOpen').addEventListener('change',()=>{$('wifiPassword').disabled=$('wifiOpen').checked;});
let wifiSaving=false;
$('saveWifi').addEventListener('click',()=>run(async()=>{
 if(wifiSaving)return false;
 const ssid=$('wifiSsid').value,password=$('wifiOpen').checked?'':$('wifiPassword').value;
 const nameHex=wifiHex(ssid),passHex=wifiHex(password);
 if(!nameHex||nameHex.length>64||ssid.includes('\0')||password.includes('\0')||(!passHex&&!$('wifiOpen').checked)||passHex.length>126||(passHex&&passHex.length<16))throw new Error('名称须为1–32字节；密码须为8–63字节，开放网络请勾选无密码');
 wifiSaving=true;$('saveWifi').disabled=true;
 try{await command('WIFISET',`${nameHex},${passHex}`);$('wifiPassword').value='';$('showWifiPassword').checked=false;$('wifiPassword').type='password';wifiEditing=false;await readWifi();}
 finally{wifiSaving=false;$('saveWifi').disabled=false;}
},'网络已保存，等待设备连接结果'));
$('retryWifi').addEventListener('click',()=>run(async()=>{await command('WIFIRETRY');await readWifi();}));
$('readWifi').addEventListener('click',()=>run(readWifi));
$('forgetWifi').addEventListener('click',()=>run(async()=>{if(!confirm('删除时钟保存的网络？手机蓝牙连接会保留。'))return false;await command('WIFIFORGET');$('wifiPassword').value='';wifiEditing=false;await readWifi();},'已删除设备网络'));

// One live CALFAST at a time; revisions coalesce edits and invalidate stale callbacks.
$('calCompare').insertAdjacentHTML('beforebegin','<p id="calLiveStatus" role="status">先进入装臂调试；进入后微调会立即预览。</p><p id="calPoseHint" class="hint"></p>');
const calFields=['slz','sls','srz','srs'];
let calRevision=0,calEpoch=0,calTimer=0,calFlight=null,calAcknowledged='',calActionBusy=false;
function calibrationValues(){return calFields.map(id=>{const input=$(id),n=Number(input.value);if(input.value===''||!Number.isInteger(n)||n<Number(input.min)||n>Number(input.max))throw new Error('请检查校准参数范围');return n;}).join(',');}
function cancelLiveCal(){clearTimeout(calTimer);calTimer=0;++calEpoch;++calRevision;calAcknowledged='';}
function calAvailability(){
 const disabled=!ready||state.mode!=='install'||calActionBusy;
 for(const el of document.querySelectorAll('.cal-fields input,.nudge button,#saveCal,#previewCal,#loadSavedCal'))el.disabled=disabled;
 for(const id of ['enterInstall','poseA','poseB','exitInstall','restoreCal','wizardNext'])$(id).disabled=calActionBusy;
 $('calPoseHint').textContent=state.mode==='install'?`当前 ${state.pose||'A/B'} 位。A位左臂角度为零，调整左比例请切到B位观察；B位右臂角度为零，调整右比例请切到A位观察。`:'参数只在装臂模式实时生效；先进入A位，再小幅调整。';
}
function scheduleLiveCal(){
 calDirty=true;++calRevision;clearTimeout(calTimer);compareCal();
 if(!ready||state.mode!=='install'){ $('calLiveStatus').textContent='先连接并进入装臂调试，参数尚未应用。';return; }
 $('calLiveStatus').textContent='准备预览最新参数…';calTimer=setTimeout(()=>{calTimer=0;drainLiveCal();},180);
}
async function drainLiveCal(){
 if(calFlight)return calFlight;
 if(!ready||state.mode!=='install')return false;
 const epoch=calEpoch;
 calFlight=(async()=>{
  while(ready&&state.mode==='install'&&epoch===calEpoch){
   const revision=calRevision;
   try{
    const values=calibrationValues();
    if(values!==calAcknowledged){$('calLiveStatus').textContent='正在更新当前姿态…';await command('CALFAST',values);}
    if(epoch!==calEpoch)return false;
    calAcknowledged=values;
    if(revision!==calRevision)continue;
    calDirty=false;await refresh();
    if(epoch!==calEpoch)return false;
    if(revision!==calRevision)continue;
    $('calLiveStatus').textContent='已预览当前姿态，尚未保存；确认后点“保存到时钟”。';return true;
   }catch(error){if(epoch===calEpoch){calDirty=true;$('calLiveStatus').textContent=`未应用：${error.message}。修改后自动重试，或点“立即重试预览”。`;}return false;}
  }
  return false;
 })();
 try{return await calFlight;}finally{calFlight=null;}
}
async function flushLiveCal(){
 clearTimeout(calTimer);calTimer=0;
 if(calFlight)await calFlight;
 if(!ready||state.mode!=='install')throw new Error('请先连接并进入装臂调试');
 if(!await drainLiveCal())throw new Error('最新参数未成功预览，未保存');
}
async function calAction(fn){
 if(calActionBusy)return false;calActionBusy=true;calAvailability();
 try{return await fn();}finally{calActionBusy=false;calAvailability();}
}
for(const id of calFields)$(id).addEventListener('input',scheduleLiveCal);
$('previewCal').addEventListener('click',()=>run(()=>calAction(flushLiveCal)));
$('saveCal').addEventListener('click',()=>run(()=>calAction(async()=>{await flushLiveCal();await command('SAVE');calDirty=false;await refresh();applyConfig(parseState(await command('CONFIG')));$('calLiveStatus').textContent='当前校准已保存，断电保留。';}),'校准参数已保存，断电保留'));
$('enterInstall').addEventListener('click',()=>run(()=>calAction(async()=>{if(!confirm('进入A位会移动机械臂，微调随后自动预览。请确认周围无障碍。'))return false;cancelLiveCal();await command('INSTALL');calDirty=false;await refresh();$('calLiveStatus').textContent='已进入A位；修改参数会自动预览。';}),'已进入安装模式'));
for(const [id,pose] of [['poseA',0],['poseB',1]])$(id).addEventListener('click',()=>run(()=>calAction(async()=>{await flushLiveCal();await command('POSE',pose);await refresh();}),`已定位 ${pose?'B':'A'} 位`));
$('exitInstall').addEventListener('click',()=>run(()=>calAction(async()=>{cancelLiveCal();await command('EXIT');calDirty=false;await refresh();$('calLiveStatus').textContent='已退出装臂；未保存的预览参数重启后恢复。';}),'已退出安装模式'));
for(const [id,load] of [['loadSavedCal',true],['restoreCal',false]])$(id).addEventListener('click',()=>run(()=>calAction(async()=>{cancelLiveCal();if(load)await command('CALLOAD');calDirty=false;await refresh();$('calLiveStatus').textContent=load?'已恢复设备保存值并更新姿态。':'已读取设备当前参数。';})));
$('emergencyStop').addEventListener('click',()=>{cancelLiveCal();$('calLiveStatus').textContent='已停止；待发送的微调已取消。';},true);
document.querySelectorAll('nav button').forEach(button=>button.addEventListener('click',()=>{
 cancelLiveCal();
 if(button.dataset.tab==='calibrate'&&ready){calDirty=false;refresh().then(()=>{$('calLiveStatus').textContent=state.mode==='install'?'已读取当前姿态；修改参数会自动预览，确认后再保存。':'先进入装臂调试；进入后微调会立即预览。';}).catch(error=>{$('calLiveStatus').textContent=error.message;});}
},true));
const nativeEvent31=window.onNativeEvent;
window.onNativeEvent=async event=>{
 if(event.type==='connection'&&event.state!=='ready'){cancelLiveCal();calDirty=false;$('wifiPassword').value='';$('showWifiPassword').checked=false;$('wifiPassword').type='password';$('wifiStatus').textContent='蓝牙已断开；重新连接后读取网络结果。';$('calLiveStatus').textContent='蓝牙已断开；待发送的微调已取消。';}
 await nativeEvent31(event);
 if(event.type==='line'){
  const parts=event.line.split('|');
  if(parts[1]==='WIFI')renderWifi(parseState(parts[2]));
  if(parts[1]==='STATE'){
   calAvailability();
   if(state.mode!=='install'){clearTimeout(calTimer);calTimer=0;}
  }
 }
 if(event.type==='connection'){calAvailability();if(event.state==='ready')try{await readWifi();$('calLiveStatus').textContent=state.mode==='install'?'已重新连接并读取当前姿态；修改参数会自动预览。':'先进入装臂调试；进入后微调会立即预览。';}catch(error){$('wifiStatus').textContent=error.message;}}
};
calAvailability();
