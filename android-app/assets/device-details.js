'use strict';
aboutView412.querySelector('.about-card').insertAdjacentHTML('beforeend','<div class="info-pair"><span>设备码</span><strong id="aboutDeviceCode">未连接</strong></div><div class="info-pair"><span>蓝牙地址</span><strong id="aboutDeviceAddress">未连接</strong></div>');
const homeCode414=document.createElement('p');homeCode414.id='homeDeviceCode';homeCode414.className='hint';homeCode414.style.overflowWrap='anywhere';
document.querySelector('.device-card-info').append(homeCode414);
const diagnostic414=document.createElement('div');diagnostic414.className='feature-card';
diagnostic414.innerHTML='<h2>归位诊断</h2><p class="hint">读取归位目标、校准值与舵机输出配置，不会移动机械臂。这里显示的是控制指令，不是机械臂实际位置。</p><button class="secondary full" id="readMotionInfo" disabled>读取归位诊断</button><p class="hint" id="motionInfo" style="white-space:pre-wrap;overflow-wrap:anywhere">连接 S3 后可读取。</p>';
$('panel-calibrate').append(diagnostic414);
let identityEpoch414=0;
function renderIdentity414(){
 if(!ready)for(const id of ['slz','sls','srz','srs']){$(id).value='';$(id).placeholder='未读取';}
 if(ready)currentDevice.code=DeviceIdentityUI.code(state.id)||currentDevice.code;
 const code=ready?currentDevice.code:'';
 const label=code?'小噜蓝牙时钟':DeviceIdentityUI.name(currentDevice.name);
 $('deviceName').textContent=ready?label:'未连接时钟';
 document.querySelector('.device-card-info h1').textContent=ready?label:'我的时钟';
 homeCode414.textContent=ready?(code||currentDevice.address):'';
 $('aboutDeviceCode').textContent=ready?(code||'固件未提供设备码'):'未连接';
 $('aboutDeviceAddress').textContent=ready?(currentDevice.address||'未提供'):'未连接';
 const model=aboutView412.querySelectorAll('.info-pair strong')[1];
 if(model)model.textContent=ready?(state.board==='s3-n16r8'||code?'ESP32-S3 N16R8':'以设备上报为准'):'未连接';
 $('readMotionInfo').disabled=!ready||!code;
}
$('readMotionInfo').addEventListener('click',()=>run(async()=>{
 const epoch=identityEpoch414;$('readMotionInfo').disabled=true;
 try{
  const data=parseState(await command('MOTIONINFO'));
  if(epoch!==identityEpoch414||!ready)return;
  if(DeviceIdentityUI.code(data.id)!==currentDevice.code)throw new Error('设备身份不一致，请重新连接后读取');
  $('motionInfo').textContent=`设备码：${data.id}\n状态：${data.mode==='install'?'装臂 '+data.pose+' 位':data.busy==='1'?'绘制中':'待机'}\n归位目标：X=${data.hx}，Y=${data.hy}\n归位脉宽：左 ${data.left} μs / 右 ${data.right} μs\n输出配置：左 GPIO${data.lpin} ${data.lfreq} Hz / 右 GPIO${data.rpin} ${data.rfreq} Hz\n当前 PWM 寄存器：${data.lduty??'—'} / ${data.rduty??'—'}（14位，非实测）\n当前校准：${data.slz}, ${data.sls}, ${data.srz}, ${data.srs}\n默认 C3 对照：1201 μs / 710 μs（仅默认校准时比较）`;
 }finally{if(epoch===identityEpoch414)renderIdentity414();}
}));
const identityNative414=window.onNativeEvent;
window.onNativeEvent=async event=>{
 if(event.type==='connection'){++identityEpoch414;$('motionInfo').textContent='连接后点击读取；不会移动机械臂。';}
 const epoch=identityEpoch414;
 await identityNative414(event);
 if(epoch===identityEpoch414)renderIdentity414();
};
renderIdentity414();
