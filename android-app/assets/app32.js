'use strict';
errors.NIGHT_QUIET='当前处于夜间免打扰时段，试听也保持静音';
$('wifiCard').insertAdjacentHTML('afterend',`<div class="feature-card" id="soundCard"><h2>蜂鸣器与提醒</h2><p id="soundStatus" class="hint" role="status">连接后读取声音设置。</p><div id="soundEvents"></div><label class="form-row">完成提醒音<select id="alarmRing"><option value="4">交替铃声</option><option value="1">上行三音</option><option value="6">短提示音</option></select></label><label class="form-row">提醒重复<select id="alarmRepeats"><option value="1">1 遍</option><option value="2">2 遍</option><option value="3">3 遍</option></select></label><label class="form-row">声音免打扰<input id="soundNight" type="checkbox"></label><label class="form-row">静音开始小时<input id="soundFrom" type="number" min="0" max="23" value="22"></label><label class="form-row">静音结束小时<input id="soundTo" type="number" min="0" max="23" value="8"></label><p class="hint">开始整点生效，结束整点恢复，可跨午夜；起止相同表示全天静音。需先校时；总静音始终优先。</p><button class="primary full" id="saveSound">保存声音设置</button><h2 class="sound-preview-title">音效试听</h2><div class="edit-grid" id="soundPreviews"></div><button class="secondary full" id="soundReminder">播放完成提醒</button><button class="text-button" id="silenceSound">仅停止声音</button><p class="hint">试听也遵守静音和夜间免打扰。仅停止声音不会取消绘图或计时；下次事件仍可提醒。整点报时按12小时制响1–12声。按键与每周计划可选“声音提醒”，只响铃、不移动机械臂。无源蜂鸣器以音高和节奏区分提示，不调整驱动电压。</p></div>`);
const soundEventLabels=['实体按键反馈','手动绘图完成提示','倒计时与番茄钟提示','蓝牙连接提示','运动故障提示'];
for(let i=0;i<5;i++){
 const label=document.createElement('label');label.className='form-row';label.textContent=soundEventLabels[i];const input=document.createElement('input');input.type='checkbox';input.id=`soundEvent${i}`;label.append(input);$('soundEvents').append(label);
}
const soundNames=['轻触','完成','休息','专注','交替铃声','错误','整点短音','连接'];
soundNames.forEach((name,id)=>{const button=document.createElement('button');button.textContent=name;button.dataset.sound=id;button.addEventListener('click',()=>run(async()=>{await command('SOUND',id);await refresh();},`正在试听：${name}`));$('soundPreviews').append(button);});
function renderSoundStatus(){
 $('soundStatus').textContent=Number(state.v||0)<3.2?'请同时升级C3固件和App至3.2':state.quiet==='1'?'总静音已开启，所有音效关闭':state.buzz==='1'?'蜂鸣器正在播放；可单独停止声音':'声音空闲；自动提示遵守下方事件开关与免打扰设置';
}
function applySound(cfg){
 for(let i=0;i<5;i++)$(`soundEvent${i}`).checked=!!(Number(cfg.flags)&1<<i);
 $('alarmRing').value=cfg.ring;$('alarmRepeats').value=cfg.repeats;$('soundNight').checked=cfg.night==='1';$('soundFrom').value=cfg.from;$('soundTo').value=cfg.to;renderSoundStatus();
}
async function readSounds(){applySound(parseState(await command('SOUNDINFO')));}
$('saveSound').addEventListener('click',()=>run(async()=>{
 let flags=0;for(let i=0;i<5;i++)if($(`soundEvent${i}`).checked)flags|=1<<i;
 await command('SOUNDCFG',`${flags},${$('alarmRing').value},${$('alarmRepeats').value},${$('soundNight').checked?1:0},${integer('soundFrom',0,23)},${integer('soundTo',0,23)}`);await readSounds();
},'声音设置已保存，断电保留'));
$('soundReminder').addEventListener('click',()=>run(async()=>{await command('ALERT');await refresh();},'已播放完成提醒'));
$('silenceSound').addEventListener('click',()=>run(async()=>{await command('SILENCE');await refresh();},'已停止声音，绘图和计时继续'));
$('refreshAll').addEventListener('click',()=>{if(ready)run(readSounds);});
const nativeEvent32=window.onNativeEvent;
window.onNativeEvent=async event=>{
 await nativeEvent32(event);
 if(event.type==='connection'&&event.state==='ready'){if(Number(state.v)<3.2){renderSoundStatus();return;}try{await readSounds();}catch(error){$('soundStatus').textContent=error.message;}}
 if(event.type==='connection'&&event.state!=='ready')$('soundStatus').textContent='连接后读取声音设置。';
 if(event.type==='line'&&event.line.split('|')[1]==='STATE')renderSoundStatus();
};
