'use strict';
errors.STRIP_UNVERIFIED='灯带电流尚未确认，设备保持关闭';
$('panel-control').insertAdjacentHTML('beforeend',`<div class="feature-card" id="boardCard"><h2>屏幕与环境</h2><p id="boardStatus" class="hint" role="status">连接后查询设备模块。</p><div class="edit-grid"><div><b>温度</b><p id="boardTemp">—</p></div><div><b>湿度</b><p id="boardHumidity">—</p></div></div><p id="boardAge" class="hint">等待采样</p><p id="boardLight" class="hint">光敏：—</p><label class="form-row">屏幕页面<select id="boardPage" disabled><option value="0">时间与连接</option><option value="1">温湿度与光敏</option><option value="2">任务与倒计时</option></select></label><button class="secondary full" id="boardStrip" disabled>灯带待确认</button><button class="text-button" id="boardRefresh" disabled>刷新模块状态</button><p class="hint">新版固件：空闲时中键长按 5 秒进入／退出本机设置，短按保存；左键选择项目，右键修改。正常页面左键控制灯带，右键切换屏幕。任务页显示绘制、归位与计时状态。</p></div>`);
let boardCaps=null,boardEnv=null,boardEpoch=0,boardReceivedAt=0,boardFlight=false;
function resetBoard(){
 boardCaps=boardEnv=null;boardReceivedAt=0;
 $('boardTemp').textContent=$('boardHumidity').textContent='—';
 $('boardAge').textContent='等待采样';$('boardLight').textContent='光敏：—';
 $('boardStatus').textContent='连接后查询设备模块。';
 $('boardPage').disabled=$('boardStrip').disabled=$('boardRefresh').disabled=true;
 $('boardStrip').textContent='灯带待确认';
}
function renderBoard(){
 if(!ready||!boardCaps||!boardEnv)return;
 const age=Number(boardEnv.age),elapsed=Math.max(0,(Date.now()-boardReceivedAt)/1000);
 const valid=boardEnv.sensor==='valid'&&Number.isFinite(age)&&age+elapsed<=10&&Number.isFinite(Number(boardEnv.temp))&&Number.isFinite(Number(boardEnv.humidity));
 $('boardTemp').textContent=valid?`${boardEnv.temp} °C`:'—';
 $('boardHumidity').textContent=valid?`${boardEnv.humidity} %`:'—';
 $('boardAge').textContent=valid?`采样于 ${Math.floor(age+elapsed)} 秒前`:
  boardEnv.sensor==='waiting'?'等待首次采样':boardEnv.sensor==='missing'?'未读到温湿度模块':boardEnv.sensor==='error'?'温湿度读取失败':'温湿度已过期，等待空闲时重新采样';
 $('boardLight').textContent=`光敏：DO ${boardEnv.do==='1'?'高电平':'低电平'}（未标定明暗极性）`;
 $('boardStatus').textContent=`ESP32-S3 · 0.96英寸 SSD1306${boardEnv.oled==='1'?'已响应':'未响应'}${state.busy==='1'?' · 绘制中，优先运动，屏幕可能暂缓刷新':''}`;
 if(document.activeElement!==$('boardPage'))$('boardPage').value=boardEnv.page;
 $('boardPage').disabled=false;$('boardRefresh').disabled=false;
 $('boardStrip').disabled=boardCaps.strip!=='1';
 $('boardStrip').textContent=boardCaps.strip!=='1'?'灯带电流待确认 · 已锁定':boardEnv.strip==='1'?'关闭灯带':'开启灯带';
}
async function readBoard(){
 const epoch=boardEpoch;
 if(!ready||!boardCaps||boardCaps.env!=='1'||boardFlight)return;
 boardFlight=true;
 try{const cfg=parseState(await command('ENV'));if(epoch!==boardEpoch||!ready)return;boardEnv=cfg;boardReceivedAt=Date.now();renderBoard();}
 finally{boardFlight=false;}
}
async function discoverBoard(){
 const epoch=boardEpoch;
 try{
  const caps=parseState(await command('CAPS'));
  if(epoch!==boardEpoch||!ready)return;
  boardCaps=caps;
  if(caps.env!=='1'){$('boardStatus').textContent='当前设备未提供环境模块能力。';return;}
  await readBoard();
 }catch(error){if(epoch!==boardEpoch||!ready)return;resetBoard();$('boardRefresh').disabled=false;$('boardStatus').textContent=error.message===errors.UNKNOWN_COMMAND?'当前C3固件未提供屏幕与环境模块，原功能可继续使用。':`模块查询失败：${error.message}`;}
}
$('boardPage').addEventListener('change',()=>run(async()=>{try{await command('PAGE',integer('boardPage',0,2));}finally{await readBoard();}}));
$('boardStrip').addEventListener('click',()=>run(async()=>{if(boardCaps?.strip!=='1')return;try{await command('STRIP',boardEnv?.strip==='1'?0:1);}finally{await readBoard();}}));
$('boardRefresh').addEventListener('click',()=>run(()=>boardCaps?readBoard():discoverBoard()));
const nativeEvent40=window.onNativeEvent;
window.onNativeEvent=async event=>{
 const epoch=event.type==='connection'?++boardEpoch:boardEpoch;
 if(event.type==='connection')resetBoard();
 await nativeEvent40(event);
 if(epoch!==boardEpoch)return;
 if(event.type==='connection'&&event.state==='ready'&&ready)await discoverBoard();
 if(event.type==='line'&&event.line.split('|')[1]==='STATE')renderBoard();
};
setInterval(()=>{renderBoard();},1000);
setInterval(()=>{if(!document.hidden&&activeTab==='environment'&&ready&&boardCaps&&!uploading&&!otaBusy&&requests.size===0)readBoard().catch(error=>{$('boardStatus').textContent=error.message;});},5000);
resetBoard();
