'use strict';
Object.assign(errors,{WIFI_SCAN_BUSY:'正在搜索网络，请稍候或取消搜索'});
Object.assign(wifiLabels,{saved:'网络已保存',scanning:'正在搜索附近网络…'});
let wifiScanEpoch=0,wifiScanBusy=false,wifiScanDone=false;
let wifi412State={status:'unconfigured',ssid:'',ip:''};
const wifiCard412=$('wifiCard');
const wifiOldNodes={status:$('wifiStatus'),ssid:$('wifiSsid').closest('label'),password:$('wifiPassword').closest('label'),show:$('showWifiPassword').closest('label'),open:$('wifiOpen').closest('label'),save:$('saveWifi'),retry:$('retryWifi'),forget:$('forgetWifi'),read:$('readWifi')};
wifiCard412.replaceChildren();
wifiCard412.insertAdjacentHTML('beforeend',`<div class="network-banner" id="networkBanner"></div><div class="list-heading"><h2>附近的 Wi-Fi</h2><button id="wifiScanButton" class="small-button">搜索网络</button></div><p class="hint" id="wifiScanStatus" role="status">由时钟搜索附近的2.4GHz网络。</p><div id="wifiNetworks" class="network-list"></div><button id="wifiScanCancel" class="text-button" hidden>取消搜索</button><button id="wifiManual" class="text-button">添加隐藏网络</button><details id="wifiManage"><summary>已保存网络</summary><div id="wifiManageActions"></div></details>`);
$('networkBanner').append(wifiOldNodes.status);
$('wifiManageActions').append(wifiOldNodes.retry,wifiOldNodes.forget,wifiOldNodes.read);
const wifiDialog=document.createElement('dialog');wifiDialog.id='wifiConnectDialog';wifiDialog.setAttribute('aria-labelledby','wifiDialogTitle');
wifiDialog.innerHTML='<div class="dialog-head"><h2 id="wifiDialogTitle">连接网络</h2><button id="wifiDialogClose" class="icon-button" aria-label="关闭网络连接">×</button></div><p class="hint" id="wifiSecurityHint"></p><div id="wifiConnectFields"></div><button id="wifiDialogStop" class="text-button">停止 / 关灯</button>';
document.body.append(wifiDialog);$('wifiConnectFields').append(wifiOldNodes.ssid,wifiOldNodes.password,wifiOldNodes.show,wifiOldNodes.open,wifiOldNodes.save);
wifiOldNodes.save.textContent='连接';$('wifiPassword').placeholder='输入 Wi-Fi 密码';
function wifiScanButtons(){
 $('wifiScanButton').disabled=!ready||boardCaps?.wifiscan!=='1'||wifiScanBusy||otaBusy||uploading;
 $('wifiScanButton').textContent=wifiScanBusy?'搜索中…':'重新搜索';
 $('wifiScanCancel').hidden=!wifiScanBusy;
 $('wifiManual').disabled=!ready||wifiScanBusy||otaBusy||uploading;
}
function showWifiConnect(name,auth,manual=false){
 if(!ready||wifiScanBusy||otaBusy||uploading)return;
 wifiEditing=true;$('wifiSsid').value=name;$('wifiPassword').value='';$('showWifiPassword').checked=false;$('wifiPassword').type='password';
 $('wifiOpen').checked=auth==='open';$('wifiPassword').disabled=auth==='open';
 wifiOldNodes.ssid.hidden=!manual;wifiOldNodes.open.hidden=!manual;
 wifiOldNodes.password.hidden=wifiOldNodes.show.hidden=auth==='open'&&!manual;
 $('wifiDialogTitle').textContent=manual?'添加隐藏网络':name;
 $('wifiSecurityHint').textContent=auth==='open'&&!manual?'此网络无需密码。':'密码将通过蓝牙发送给时钟。';
 if(!wifiDialog.open)wifiDialog.showModal();
 (manual?$('wifiSsid'):$('wifiPassword')).focus();
}
$('wifiDialogClose').addEventListener('click',()=>{wifiDialog.close();$('wifiPassword').value='';});
$('wifiDialogStop').addEventListener('click',()=>$('emergencyStop').click());
wifiDialog.addEventListener('cancel',()=>$('wifiPassword').value='');
$('wifiManual').addEventListener('click',()=>showWifiConnect('','psk',true));
function networkStrength(rssi){return rssi>=-55?'信号强':rssi>=-70?'信号良好':'信号较弱';}
function renderNetworks(rows){
 $('wifiNetworks').replaceChildren();
 for(const row of rows){
  const b=document.createElement('button');b.className='network-row';b.disabled=row.auth==='unsupported';
  const icon=document.createElement('span');icon.className='wifi-glyph';icon.textContent='◔';icon.setAttribute('aria-hidden','true');
  const text=document.createElement('span'),name=document.createElement('strong'),meta=document.createElement('small');
  name.textContent=wifiText(row.ssid);meta.textContent=`${networkStrength(Number(row.rssi))} · ${row.auth==='open'?'开放网络':row.auth==='unsupported'?'暂不支持此认证':'需要密码'}`;
  text.append(name,meta);const arrow=document.createElement('span');arrow.className='row-arrow';arrow.textContent='›';b.append(icon,text,arrow);
  b.addEventListener('click',()=>showWifiConnect(name.textContent,row.auth));$('wifiNetworks').append(b);
 }
}
async function scanNearbyWifi(){
 if(!ready||boardCaps?.wifiscan!=='1'||wifiScanBusy||otaBusy||uploading)return;
 const epoch=++wifiScanEpoch;wifiScanBusy=true;wifiScanDone=false;wifiScanButtons();renderNetworks([]);
 $('wifiScanStatus').textContent='正在由时钟搜索附近网络…';
 try{
  let info=parseState(await command('WIFISCAN'));const deadline=Date.now()+20000;
  while(info.state==='scanning'&&Date.now()<deadline){
   await new Promise(resolve=>setTimeout(resolve,600));if(epoch!==wifiScanEpoch||!ready)return;
   info=parseState(await command('WIFILIST','0'));
  }
  if(epoch!==wifiScanEpoch||!ready)return;
  if(info.state!=='ready')throw Error(info.state==='cancelled'?'搜索已取消':'搜索未完成，请重试');
  const count=Number(info.count);if(!Number.isInteger(count)||count<0||count>16)throw Error('网络列表无效，请重新搜索');
  const rows=[];
  for(let i=0;i<count;i++){
   const row=i===0?info:parseState(await command('WIFILIST',String(i)));
   if(epoch!==wifiScanEpoch||!ready)return;
   if(row.state!=='ready'||Number(row.index)!==i||!row.ssid)throw Error('网络列表已过期，请重新搜索');
   rows.push(row);
  }
  renderNetworks(rows);wifiScanDone=true;
  $('wifiScanStatus').textContent=count?'选择要连接的网络。':'未找到可见的2.4GHz网络。可重新搜索或添加隐藏网络。';
 }catch(error){if(epoch===wifiScanEpoch){$('wifiScanStatus').textContent=error.message;if(ready)command('WIFISCANCEL').catch(()=>{});}}
 finally{if(epoch===wifiScanEpoch){wifiScanBusy=false;wifiScanButtons();}}
}
function cancelNearbyWifi(){
 const busy=wifiScanBusy;++wifiScanEpoch;wifiScanBusy=false;wifiScanButtons();
 if(busy&&ready)command('WIFISCANCEL').catch(()=>{});
 if(busy)$('wifiScanStatus').textContent='已取消搜索';
}
$('wifiScanButton').addEventListener('click',()=>run(scanNearbyWifi));
$('wifiScanCancel').addEventListener('click',cancelNearbyWifi);
const originalRenderWifi412=renderWifi;
renderWifi=cfg=>{
 wifi412State=cfg;originalRenderWifi412(cfg);
 if(cfg.status==='connecting'&&wifiDialog.open){wifiDialog.close();$('wifiPassword').value='';}
 if(typeof renderDevice412==='function')renderDevice412();
};
const nativeWifi412=window.onNativeEvent;
window.onNativeEvent=async event=>{
 if(event.type==='connection'&&event.state!=='ready'){
  ++wifiScanEpoch;wifiScanBusy=false;wifiScanDone=false;renderNetworks([]);if(wifiDialog.open)wifiDialog.close();
  wifi412State={status:'unconfigured',ssid:'',ip:''};
 }
 await nativeWifi412(event);
 wifiScanButtons();
 if(event.type==='connection'&&event.state==='ready'){
  $('wifiScanStatus').textContent=boardCaps?.wifiscan==='1'?'由时钟搜索附近的2.4GHz网络。':'当前固件尚无搜索功能，升级4.1.2后可用；也可手动添加网络。';
  if(typeof currentRoute412!=='undefined'&&currentRoute412==='wifi')scanNearbyWifi();
 }
};
wifiScanButtons();
