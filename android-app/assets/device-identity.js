'use strict';
// Pure formatting helpers shared by scan/connected views and offline tests.
const DeviceIdentityUI=Object.freeze({
 code(value){return /^S3-[0-9A-F]{12}$/i.test(value||'')?value.toUpperCase():'';},
 fromName(value){const match=/^小噜时钟 ([0-9A-F]{12})$/i.exec(value||'');return match?'S3-'+match[1].toUpperCase():'';},
 name(value){return typeof value==='string'&&value.trim()?value.trim().slice(0,80):'未命名时钟';},
 scan(event){const name=this.name(event.name),code=this.fromName(name);return `${code?'小噜蓝牙时钟 · '+code:name+' · '+event.address}  ·  ${event.rssi} dBm　连接 →`;}
});
