'use strict';
window.DailyPolicyUI=(()=>{
 const keys={DAILY:['every','from','to','night','nfrom','nto','dim','ambient','darklow'],DISPLAY:['animation','sleep','brightness']};
 function validate(type,v){
  const out={};for(const k of keys[type]){if(v[k]===undefined||v[k]===''||!Number.isInteger(Number(v[k])))throw Error('硬件配置不完整，请重新读取');out[k]=Number(v[k]);}
  const range=(k,a,b)=>out[k]>=a&&out[k]<=b;
  if(type==='DAILY'){
   if(!range('every',1,60)||!['from','to','nfrom','nto'].every(k=>range(k,0,1439))||out.nfrom===out.nto||!range('night',0,1)||!range('dim',5,100)||!range('ambient',0,1)||!range('darklow',0,1))throw Error('请检查日常设置范围，夜间开始与结束不能相同');
  }else if(!range('animation',0,1)||!(out.sleep===0||range('sleep',15,3600))||!range('brightness',5,100))throw Error('熄屏时间须为 0（常亮）或 15–3600 秒，亮度为 5%–100%');
  return out;
 }
 class Store{
  constructor(command,parse){this.command=command;this.parse=parse;this.epoch=0;this.data={};this.busy=false;}
  reset(){this.epoch++;this.data={};this.busy=false;}
  async read(type){const epoch=this.epoch;const v=this.parse(await this.command(type));if(epoch!==this.epoch)throw Error('设备连接已变化，请重新读取');if(keys[type])validate(type,v);this.data[type]=v;return v;}
  async save(type,patch){
   if(this.busy)throw Error('正在保存，请稍候');this.busy=true;const epoch=this.epoch;
   try{
    if(!keys[type]||Object.keys(patch).some(k=>!keys[type].includes(k)))throw Error('无效设置字段');
    const latest=await this.read(type),next=validate(type,{...latest,...patch});
    if(epoch!==this.epoch)throw Error('连接已变化，未保存');
    await this.command(type+'SET',keys[type].map(k=>next[k]).join(','));
    if(epoch!==this.epoch)throw Error('连接已变化，请重新读取确认保存结果');
    const actual=await this.read(type);
    if(keys[type].some(k=>Number(actual[k])!==next[k]))throw Error('硬件回读与保存值不同，请检查设备当前设置');
    return actual;
   }finally{if(epoch===this.epoch)this.busy=false;}
  }
 }
 const clock=m=>Number.isInteger(Number(m))?`${String(Math.floor(Number(m)/60)).padStart(2,'0')}:${String(Number(m)%60).padStart(2,'0')}`:'—';
 function minute(s){if(!/^\d{2}:\d{2}$/.test(s))throw Error('请选择有效时间');const [h,m]=s.split(':').map(Number);if(h>23||m>59)throw Error('请选择有效时间');return h*60+m;}
 const inside=(now,from,to)=>from===to|| (from<to?now>=from&&now<to:now>=from||now<to);
 const stages={idle:'等待任务',preparing:'准备中',uploading:'上传中',drawing:'绘制中',homing:'归位中',waiting:'等待下一阶段',complete:'已完成',stopped:'已中止',error:'任务异常'};
 function task(state){return state.needhome==='1'?'需要先归位':stages[state.stage]||'等待硬件状态';}
 function next(d,s){
  if(s.needhome==='1')return '自动绘时暂停：需要先归位';
  if(s.auto!=='1')return '自动绘时已关闭';
  if(s.clock!=='1')return '自动绘时暂停：尚未校时';
  if(s.fault==='1'||s.mode==='install')return '自动绘时暂停：请检查设备状态';
  if(s.busy==='1'||Number(s.timer)>0||Number(s.total)>0)return '任务进行中，下一次绘时待硬件确认';
  const wait=Number(d?.next);if(!d||d.next===undefined||!Number.isFinite(wait)||wait<0)return '下一次绘时暂不可用';
  return `${s.night==='1'||d.active==='1'?'系统夜间限制中；':''}下次预计 ${Math.floor(wait/60)} 分 ${Math.floor(wait%60)} 秒后（硬件回报）`;
 }
 function light(v){
  if(!v)return '等待光敏详细状态';
  const raw=v.raw==='1'?'高':'低',stable=v.stable==='1'?'高':'低',dark=v.darklow==='1'?v.stable==='0':v.stable==='1';
  return `原始 ${raw}电平 · 稳定 ${stable}电平 · 按当前极性为${dark?'暗':'亮'}；${v.verified==='1'?'已观察到两次稳定变化':'信号待验证，每次开机需两次稳定电平变化'}。`;
 }
 return {keys,validate,Store,clock,minute,inside,stages,task,next,light};
})();
