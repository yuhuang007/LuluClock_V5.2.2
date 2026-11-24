'use strict';
Object.assign(errors,{OTA_BUSY:'设备正在无线升级，请等待完成或取消升级',OTA_WIFI_REQUIRED:'请先在设置中配置时钟的Wi-Fi',OTA_BAD_SHA:'固件校验信息无效',OTA_BAD_SIZE:'固件大小不适合当前OTA分区',OTA_NO_MEMORY:'设备内存不足，请重启后重试'});
$('panel-settings').insertAdjacentHTML('beforeend',`<div class="feature-card" id="otaCard"><h2>固件无线升级</h2><p class="hint">选择本地编译的应用固件后，再确认开始升级。</p><p id="otaStatus" role="status" class="hint">连接后读取设备固件版本。</p><button id="otaChoose" class="secondary full" disabled>选择应用固件 .bin</button><p id="otaFile" class="hint">未选择固件。</p><progress id="otaProgress" max="100" value="0"></progress><button id="otaStart" class="primary full" disabled>开始无线升级</button><button id="otaCancel" class="text-button" disabled>取消升级</button><button id="otaCheck" class="text-button" disabled>读取当前版本</button><p class="hint">写入的是备用应用分区，校验成功才切换。</p></div>`);
document.querySelector('footer').textContent='噜噜时钟 4.1.3 · 本地蓝牙与局域网OTA';
let otaSupported=false,otaFile=null,otaBusy=false,otaEpoch=0,otaTimer=0,otaAccepted=false,otaQuerying=false;
let otaCurrent='';
let otaRecoveryPending=false,otaSession='',otaSerial=0,otaExpected='',otaPrevious='',otaTargetAddress='',otaTargetCode='',otaConfirmed=false,otaSentAll=false,otaOutcome='',otaVerifyTimer=0;
function otaRecoveryText(){return '固件已发送，时钟可能正在重启。正在自动重连原设备并确认版本，请保持时钟供电、手机蓝牙开启。';}
function otaAwaitReboot(confirmed=false){
 otaConfirmed=otaConfirmed||confirmed;otaAccepted=otaConfirmed;otaRecoveryPending=true;otaBusy=true;uploading=false;
 clearInterval(otaTimer);otaTimer=0;$('otaStatus').textContent=otaRecoveryText();
 if(otaConfirmed)$('otaProgress').value=100;
 native?.recoverAfterOta?.();otaButtons();
}
function otaRecoveryEnd(message){
 clearTimeout(otaVerifyTimer);otaVerifyTimer=0;
 otaRecoveryPending=false;otaAccepted=false;otaOutcome=message;otaSession='';
 native?.finishOtaRecovery?.();otaFinish(message);
}
function otaRetryVerification(epoch,session){
 clearTimeout(otaVerifyTimer);
 if(epoch===otaEpoch&&session===otaSession&&otaRecoveryPending&&ready)
  otaVerifyTimer=setTimeout(()=>{if(epoch===otaEpoch&&session===otaSession&&otaRecoveryPending&&ready)otaVerifyVersion();},2000);
}
async function otaVerifyVersion(){
 const epoch=otaEpoch,session=otaSession;
 try{
  const info=parseState(await command('OTAINFO'));
  if(epoch!==otaEpoch||session!==otaSession||!otaRecoveryPending||!ready)return;
  if(info.state==='rebooting'){otaRetryVerification(epoch,session);return;} // This is still the old boot; do not declare success.
  const address=typeof currentDevice!=='undefined'?currentDevice.address:'';
  const identity=otaTargetCode?parseState(await command('GET')):{};
  if(epoch!==otaEpoch||session!==otaSession||!otaRecoveryPending||!ready)return;
  const code=identity.id||'';
  if(otaTargetAddress&&address!==otaTargetAddress||otaTargetCode&&code!==otaTargetCode){otaRecoveryEnd('连接到的设备与升级目标不一致，无法确认结果。请重新连接原时钟后检查版本。');return;}
  otaCurrent=info.version||'';
  if(!otaExpected||!otaCurrent){otaRecoveryEnd('已自动重连，但没有读到可确认的固件版本。请点击“读取当前版本”核对，暂不视为升级成功。');return;}
  if(otaCurrent!==otaExpected){otaRecoveryEnd(`已自动重连，当前版本 ${otaCurrent}，本次目标 ${otaExpected}。目标版本未生效，可能未完成升级或已回退；请检查后重试。`);return;}
  if(!otaConfirmed&&otaPrevious===otaExpected){otaRecoveryEnd(`已自动重连，当前版本 ${otaCurrent}。由于未收到最终校验确认，且升级前后版本相同，无法确认本次重刷是否完成。`);return;}
  $('otaProgress').value=100;otaRecoveryEnd(`升级成功，已自动重连。当前固件 ${otaCurrent}。`);
 }catch(error){if(epoch===otaEpoch&&session===otaSession&&otaRecoveryPending){$('otaStatus').textContent='蓝牙已连回，正在确认固件版本。若设备仍在重启，App 会继续尝试连接。';otaRetryVerification(epoch,session);}}
}
function otaVersionCompare(a,b){
 const valid=v=>/^\d+(?:\.\d+){1,2}$/.test(v||'');if(!valid(a)||!valid(b))return null;
 // These four published padded versions precede the user-requested 5.2.2
 // renumbering. Only known historical spellings use this migration order;
 // later regular versions and unknown releases keep numeric ordering.
 const legacy=['5.02.02','5.02.03','5.02.04','5.02.05'];
 const parts=v=>{const i=legacy.indexOf(v);return i<0?v.split('.').map(Number):[5,2,1,i+1];};
 const av=parts(a),bv=parts(b);
 for(let i=0;i<4;i++){if((av[i]||0)!==(bv[i]||0))return (av[i]||0)>(bv[i]||0)?1:-1;}return 0;
}
function otaButtons(){
 $('otaChoose').disabled=!ready||!otaSupported||otaBusy||!native?.chooseFirmware;
 $('otaStart').disabled=!ready||!otaSupported||!otaFile||otaBusy||!native?.uploadFirmware;
 $('otaCancel').disabled=!otaBusy;
 $('otaCancel').textContent=otaRecoveryPending?'停止自动重连':'取消升级';
 $('otaCheck').disabled=!ready||!otaSupported||otaRecoveryPending;
 if(typeof rgbButtons==='function')rgbButtons();
}
function otaFinish(message){clearInterval(otaTimer);otaTimer=0;otaBusy=false;uploading=false;$('otaStatus').textContent=message;otaButtons();}
async function otaRead(){
 if(!ready||!otaSupported||otaQuerying)return null;
 otaQuerying=true;const epoch=otaEpoch;
 try{
  const info=parseState(await command('OTAINFO'));
  if(epoch!==otaEpoch||!ready)return null;
  otaCurrent=info.version||otaCurrent;
  if(otaBusy&&!otaAccepted&&!otaRecoveryPending){
   if(info.state==='failed'||info.state==='cancelled'){otaSession='';native?.cancelFirmware?.();otaFinish(info.error==='SHA256_MISMATCH'?'固件校验未通过，未确认升级成功。请重新选择应用固件后重试。':'设备没有完成这次升级，原固件继续可用，请重新开始升级。');}
   else if(info.state==='rebooting'){otaAwaitReboot(true);}
   else if(info.state==='uploading'||info.state==='checking'){$('otaProgress').value=Math.min(99,Number(info.pct)||0);$('otaStatus').textContent=info.state==='checking'?'设备正在校验固件，请保持供电。':`设备已接收 ${info.pct}%` ;}
  }
  return info;
 }finally{if(epoch===otaEpoch)otaQuerying=false;}
}
async function otaDiscover(){
 if(otaRecoveryPending)return;
 const epoch=otaEpoch;
 otaSupported=boardCaps?.ota==='1';otaButtons();
 if(!otaSupported){$('otaStatus').textContent='当前固件不支持OTA，请先通过TTL烧入4.1或后续OTA版本。';return;}
 const info=await otaRead();if(epoch!==otaEpoch||!info)return;
 if(otaOutcome){otaButtons();return;}
 $('otaStatus').textContent=`当前设备固件 ${otaCurrent||'未知'} · 请手动选择本地编译的应用固件。`;
}
$('otaChoose').addEventListener('click',()=>{if(otaBusy)return;otaOutcome='';otaFile=null;$('otaFile').textContent='正在选择并检查应用固件…';otaButtons();native?.chooseFirmware?.();});
$('otaStart').addEventListener('click',()=>run(async()=>{
 if(!ready||!otaSupported||!otaFile||otaBusy)return false;
 const epoch=++otaEpoch;otaBusy=true;otaAccepted=false;otaConfirmed=false;otaSentAll=false;otaOutcome='';otaRecoveryPending=false;
 otaExpected=otaFile.version||'';otaPrevious=otaCurrent;otaSession=String(++otaSerial);
 otaTargetAddress=typeof currentDevice!=='undefined'?currentDevice.address:'';
 otaTargetCode=typeof currentDevice!=='undefined'?currentDevice.code:'';
 uploading=true;otaButtons();$('otaProgress').value=0;
 $('otaStatus').textContent='正在停止任务并连接时钟Wi-Fi…';
 try{
  await command('OTAOPEN',`${otaFile.size},${otaFile.sha}`);
  const deadline=Date.now()+30000;let info=null;
  while(epoch===otaEpoch&&otaBusy&&Date.now()<deadline){
   info=await otaRead();
   if(info?.state==='ready')break;
   if(info?.state==='failed'||info?.state==='cancelled')throw Error(info.error||'升级窗口已关闭');
   await new Promise(resolve=>setTimeout(resolve,800));
  }
  if(epoch!==otaEpoch||!otaBusy)return false;
  if(info?.state!=='ready'||!info.ip||!info.token)throw Error('时钟Wi-Fi未就绪，请检查网络与配网结果');
  $('otaStatus').textContent='开始通过Wi-Fi发送固件，请保持供电与蓝牙连接。';
  native.uploadFirmware(info.ip,info.token,otaSession);
  otaTimer=setInterval(()=>{if(ready&&otaBusy)otaRead().catch(error=>{if(!otaRecoveryPending&&epoch===otaEpoch)$('otaStatus').textContent='暂时未读到升级进度，请保持连接。';});},1200);
 }catch(error){
  if(epoch!==otaEpoch)return false;
  if(ready)try{await command('OTACANCEL');}catch(ignored){}
  otaFinish(`未开始或未完成升级：${error.message}`);
 }
}));
async function otaCancel(){
 if(otaRecoveryPending){
  ++otaEpoch;otaSession='';native?.cancelOtaReconnect?.();otaRecoveryEnd('已停止自动重连。时钟可能已经完成升级；再次连接后请检查固件版本。');return;
 }
 if(!otaBusy||otaAccepted)return;
 ++otaEpoch;otaSession='';native?.cancelFirmware?.();
 try{if(ready)await command('OTACANCEL');}finally{otaFinish('已请求取消升级。若设备已完成校验并重启，请重连确认版本。');}
}
$('otaCancel').addEventListener('click',()=>run(otaCancel));
$('otaCheck').addEventListener('click',()=>run(async()=>{if(!otaBusy){otaOutcome='';await otaDiscover();}else await otaRead();}));
$('emergencyStop').addEventListener('click',()=>{if(otaBusy&&!otaAccepted){++otaEpoch;native?.cancelFirmware?.();otaFinish('已发送停止并取消升级；重新连接后可查询当前固件版本。');}},true);
$('emergencyStop').addEventListener('click',()=>{if(otaRecoveryPending){++otaEpoch;native?.cancelOtaReconnect?.();otaRecoveryEnd('已停止自动重连，请再次连接后检查固件版本。');}},true);
const nativeEvent41=window.onNativeEvent;
window.onNativeEvent=async event=>{
 if(event.type==='otaFile'){
  if(!ready||!otaSupported||otaBusy)return;
  if(event.error||event.cancelled){otaFile=null;$('otaFile').textContent=event.error||'未选择文件';}
  else if(event.source==='manual'&&/^[0-9a-f]{64}$/.test(event.sha)&&Number(event.size)>=288&&Number(event.size)<=3145728){otaFile={size:Number(event.size),sha:event.sha,version:event.version||''};$('otaFile').textContent=`${event.name} · 版本 ${otaFile.version||'未知'} · ${(Number(event.size)/1024).toFixed(0)} KB · SHA-256 ${event.sha.slice(0,12)}…`;}
  otaButtons();return;
 }
 if(['otaProgress','otaResult','otaNetwork','otaRecovery'].includes(event.type)&&event.session&&event.session!==otaSession)return;
 if(event.type==='otaNetwork'){if(otaBusy&&!otaRecoveryPending)$('otaStatus').textContent=event.message;return;}
 if(event.type==='otaProgress'){
  if(otaBusy&&!otaRecoveryPending){otaSentAll=event.complete==='1'||otaSentAll;$('otaProgress').value=Math.min(99,Number(event.pct)||0);$('otaStatus').textContent=`手机发送进度 ${event.pct}% · 等待设备最终校验`;}
  return;
 }
 if(event.type==='otaRecovery'){
  if(event.state==='waiting'||event.state==='connecting'||event.state==='connected'){
   otaRecoveryPending=true;otaBusy=true;uploading=false;clearInterval(otaTimer);otaTimer=0;
   $('otaStatus').textContent=event.state==='connected'?'已自动重连，正在读取固件版本…':otaRecoveryText();otaButtons();
  }else if(event.state==='timeout'){
   ++otaEpoch;otaRecoveryEnd('暂未自动连回时钟，升级结果尚未确认。请保持时钟供电、靠近设备并打开蓝牙，再连接后检查固件版本。');
  }else if(event.state==='cancelled'&&otaRecoveryPending){++otaEpoch;otaRecoveryEnd('已停止自动重连。再次连接后请检查固件版本。');}
  return;
 }
 if(event.type==='otaResult'){
  if(!otaBusy&&!otaRecoveryPending)return;
  if(event.status==='accepted'){otaAwaitReboot(true);}
  else if(event.status==='uncertain'){otaAwaitReboot(false);}
  else if(!otaConfirmed){
   const message=event.message;otaSession='';otaRecoveryPending=false;native?.finishOtaRecovery?.();otaOutcome=message;otaFinish(message);
   if(ready)command('OTACANCEL').catch(()=>{});
  }
  return;
 }
 const connection=event.type==='connection';
 if(connection){
  ++otaEpoch;clearInterval(otaTimer);otaTimer=0;clearTimeout(otaVerifyTimer);otaVerifyTimer=0;otaQuerying=false;
  if(event.state!=='ready'){
   otaFile=null;$('otaFile').textContent='未选择固件。';
   if(otaRecoveryPending||otaAccepted||otaBusy&&otaSentAll){
    otaRecoveryPending=true;otaBusy=true;uploading=false;otaSupported=false;$('otaStatus').textContent=otaRecoveryText();
    native?.recoverAfterOta?.();
   }else{
    const wasBusy=otaBusy;otaBusy=false;uploading=false;otaSupported=false;otaCurrent='';otaSession='';native?.cancelFirmware?.();
    $('otaStatus').textContent=wasBusy?'传输期间蓝牙已断开，尚未确认升级成功。请重新连接后再试。':otaOutcome||'连接后读取设备固件版本。';
   }
   otaButtons();
  }
 }
 const eventEpoch=otaEpoch;
 await nativeEvent41(event);
 if(connection&&eventEpoch===otaEpoch&&event.state==='ready'&&ready){
  otaSupported=boardCaps?.ota==='1';
  if(otaRecoveryPending){await otaVerifyVersion();}
  else {otaBusy=false;uploading=false;otaAccepted=false;try{await otaDiscover();}catch(error){if(eventEpoch===otaEpoch)$('otaStatus').textContent=error.message;}otaButtons();}
 }
};
otaButtons();
