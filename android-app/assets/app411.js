'use strict';
$('otaCard').insertAdjacentHTML('beforeend',`<details id="rgbMaintenance"><summary>板载 RGB 灯（维护）</summary><p class="hint" id="rgbStatus">升级成功后红、绿、蓝各亮一次。板载引脚 GPIO48。</p><label class="form-row">RGB数据引脚<select id="rgbPin" disabled><option value="48">GPIO48</option></select></label><button id="rgbSave" class="secondary full" disabled>保存 RGB 引脚</button><button id="rgbTest" class="text-button" disabled>测试红绿蓝提示</button></details>`);
let rgbSupported=false,rgbEpoch=0;
function rgbButtons(){
 const disabled=!ready||!rgbSupported||otaBusy||uploading;
 $('rgbPin').disabled=true;$('rgbSave').hidden=true;$('rgbSave').disabled=true;$('rgbTest').disabled=disabled;
}
async function rgbRead(){
 if(!ready||!rgbSupported)return;
 const epoch=rgbEpoch;const info=parseState(await command('RGBINFO'));
 if(epoch!==rgbEpoch||!ready)return;
 if(info.pin==='38'||info.pin==='48')$('rgbPin').value=info.pin;
 $('rgbStatus').textContent=`GPIO${info.pin} · ${info.busy==='1'?'提示灯播放中':'升级成功后红、绿、蓝各亮一次'}。`;
}
$('rgbTest').addEventListener('click',()=>run(async()=>{
 if(!ready||!rgbSupported||otaBusy||uploading)return;
 await command('RGBTEST');$('rgbStatus').textContent='已请求红、绿、蓝各亮一次。板载引脚 GPIO48。';
}));
const nativeEvent411=window.onNativeEvent;
window.onNativeEvent=async event=>{
 const epoch=event.type==='connection'?++rgbEpoch:rgbEpoch;
 if(event.type==='connection'&&event.state!=='ready'){rgbSupported=false;rgbButtons();}
 await nativeEvent411(event);
 if(epoch!==rgbEpoch)return;
 if(event.type==='connection'&&event.state==='ready'&&ready){
  rgbSupported=boardCaps?.rgb==='1';
  if(rgbSupported)try{await rgbRead();}catch(error){$('rgbStatus').textContent=error.message;}
  else $('rgbStatus').textContent='当前固件不支持RGB设置，升级至4.1.1后重连可用。默认GPIO48。';
 }
 rgbButtons();
};
rgbButtons();
