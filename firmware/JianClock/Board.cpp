#include "Board.h"
#include "Config.h"
#include <Wire.h>
#include <U8g2lib.h>
#include <Preferences.h>

namespace board {
namespace {
// U8g2 renders the framebuffer; bounded Wire writes below own all bus traffic.
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(U8G2_R0,U8X8_PIN_NONE,config::OLED_SCL,config::OLED_SDA);
boardlogic::Sample reading;
boardlogic::Press left,right;
Diagnostics stats;
bool strip=false,displayOk=false;
daily::Light lightSignal;
bool stripWanted=false,stripOverride=false,nightActive=false,ambientActive=false,ambientDark=false;
uint32_t ambientRevision=0;
bool frameDirty=true,blankForSwitch=true,screenOn=false;
bool rendering=false,windowReady=false;
uint8_t displayed[1024]{};
bool displayedValid=false,fullFlush=true;
struct TextRow { char text[64]{}; uint8_t y=0; bool large=false; };
TextRow rows[4]{},previousRows[4]{};
unsigned renderRow=0,renderByte=0,renderX=0;
uint8_t failureStreak=0;
int frameLayout=-1;
uint8_t displayAddress=0,currentPage=0;
// Flush cursor is column-major (column * 8 + page), independent of the
// U8g2 page-major buffer. Small rectangles update all affected rows together.
uint16_t flushAt=1024;
uint8_t windowX=0,windowWidth=0,windowFirst=0,windowLast=7;
uint32_t displayBusHz=config::OLED_I2C_HZ;
uint32_t lastFrame=0,retryDisplayAt=0,nextDht=2500,hostLowAt=0,captureAt=0;
enum class DhtState { Idle, HostLow, Capture };
DhtState dhtState=DhtState::Idle;
volatile uint8_t edgeStage=0,bitCount=0;
volatile uint16_t highWidths[40];
volatile uint32_t risingAt=0;

void ARDUINO_ISR_ATTR dhtEdge(void *) {
  bool high=digitalRead(config::DHT_PIN);
  uint32_t now=micros();
  // Ignore the host-release rising edge. Response is low80/high80, then40 bits.
  if(edgeStage==0) { if(!high)edgeStage=1; }
  else if(edgeStage==1) { if(high)edgeStage=2; }
  else if(edgeStage==2) { if(!high)edgeStage=3; }
  else if(high)risingAt=now;
  else {
    const uint8_t index=bitCount;
    if(index<40) {
      highWidths[index]=now-risingAt;
      bitCount=static_cast<uint8_t>(index+1);
    }
  }
}
#include "OledVisuals.inc"

void abortDht() {
  detachInterrupt(config::DHT_PIN);
  pinMode(config::DHT_PIN,INPUT_PULLUP);
  dhtState=DhtState::Idle;
}
void dhtTick(bool allowed) {
  uint32_t now=millis();
  if(!allowed) { if(dhtState!=DhtState::Idle){abortDht();nextDht=now+2500;} return; }
  if(dhtState==DhtState::Idle) {
    if(static_cast<int32_t>(now-nextDht)<0)return;
    digitalWrite(config::DHT_PIN,LOW);pinMode(config::DHT_PIN,OUTPUT);
    hostLowAt=now;dhtState=DhtState::HostLow;return;
  }
  if(dhtState==DhtState::HostLow) {
    if(now-hostLowAt<20)return;
    edgeStage=0;bitCount=0;risingAt=0;
    attachInterruptArg(config::DHT_PIN,dhtEdge,nullptr,CHANGE);
    captureAt=now;dhtState=DhtState::Capture;pinMode(config::DHT_PIN,INPUT_PULLUP);return;
  }
  if(bitCount<40 && now-captureAt<8)return;
  detachInterrupt(config::DHT_PIN);
  bool valid=bitCount==40;
  uint8_t data[5]{};
  if(valid)for(unsigned i=0;i<40;++i){
    uint16_t width=highWidths[i];
    if(width<10||width>100)valid=false;
    data[i/8]=(data[i/8]<<1)|(width>50);
  }
  float t=0,h=0;
  valid=valid && boardlogic::decodeDht(data,t,h);
  reading.lastOk=valid;
  if(valid){reading.temperature=t;reading.humidity=h;reading.sampledAt=now;reading.ever=true;}
  abortDht();nextDht=now+2500;
}
bool busWrite(const uint8_t *data,size_t count) {
  Wire.beginTransmission(displayAddress);Wire.write(data,count);
  const uint8_t error=Wire.endTransmission();
  if(error){
    ++stats.i2cErrors;stats.lastI2cError=error;
    displayBusHz=200000; // Conservative recovery for long wires / marginal modules.
    if(failureStreak<4)++failureStreak;
    displayOk=false;flushAt=1024;frameDirty=true;blankForSwitch=true;rendering=false;windowReady=false;displayedValid=false;
    retryDisplayAt=millis()+(250U<<(failureStreak-1));return false;
  }
  return true;
}
void initDisplay() {
  displayedValid=false;visualContrast=-1;
  for(uint8_t address : {uint8_t(0x3c),uint8_t(0x3d)}) {
    Wire.beginTransmission(address);
    if(Wire.endTransmission()!=0)continue;
    displayAddress=address;
    // Rotate both axes in the controller; keep U8g2_R0 to avoid double rotation.
    const uint8_t segment=config::OLED_ROTATE_180?0xa0:0xa1;
    const uint8_t scan=config::OLED_ROTATE_180?0xc0:0xc8;
    // Keep the display dark until a complete frame has replaced power-on RAM.
    const uint8_t init[]={0,0xae,0xd5,0x80,0xa8,0x3f,0xd3,0,0x40,0x8d,0x14,0x20,1,segment,scan,0xda,0x12,0x81,0x7f,0xd9,0xf1,0xdb,0x40,0xa4,0xa6,0x2e};
    displayOk=busWrite(init,sizeof(init));screenOn=false;frameDirty=true;blankForSwitch=true;return;
  }
  ++stats.i2cErrors;stats.lastI2cError=2;displayBusHz=200000;if(failureStreak<4)++failureStreak;
  displayOk=false;retryDisplayAt=millis()+(250U<<(failureStreak-1));
}
unsigned rowCount=0;
void label(unsigned y,const char *text,bool large=false){
  if(rowCount>=4)return;
  auto &row=rows[rowCount++];row.y=y;row.large=large;
  snprintf(row.text,sizeof(row.text),"%s",text);
}
void prepareRows(const View &v) {
  for(auto &row:rows)row=TextRow{};
  rowCount=0;char line[64];
  if(v.menu){
    label(12,v.menuTitle);label(29,v.menuName);label(45,v.menuValue);label(62,"左选 右改 中保存");
  }else if(v.ota){
    label(13,"固件无线升级");
    const char *stage=v.otaStage==1?"连接网络":v.otaStage==2?"等待传输":v.otaStage==4?"正在校验":v.otaStage==5?"准备重启":"接收固件";
    snprintf(line,sizeof(line),"     %s %u%%",stage,v.otaProgress);label(33,line);
    label(63,v.otaStage==5?"保持供电 等待重启":"中键停止 / 保持供电");
  }
  else if(v.fault){label(14,"运动故障 · 已停止");label(33,v.error[0]?v.error:"请在手机检查原因");label(54,"中键停止 / 手机处理");}
  else if(v.install){label(14,"装臂与实时校准");snprintf(line,sizeof(line),"当前姿态 %c",v.poseB?'B':'A');label(31,line);}
  else if(v.timerActive){
    label(12,v.timerPhase==1?"番茄钟 · 专注":v.timerPhase==2?"番茄钟 · 休息":"倒计时");
    label(63,"中键停止");
  }else if(v.stage==static_cast<unsigned>(daily::Stage::Preparing)){
    label(13,"正在检查绘制路径");label(34,"确认可达后开始");label(62,"中键可取消");
  }else if(v.moving){
    label(13,v.stage==static_cast<unsigned>(daily::Stage::Homing)?"机械臂归位中":"机械臂绘制中");snprintf(line,sizeof(line),"     进度 %u%%",v.progress);label(32,line);
    snprintf(line,sizeof(line),"余%us 中键停止",v.eta);label(63,line);
  }else if(currentPage==0){
    label(12,v.clock?v.date:"连接手机校时");

    snprintf(line,sizeof(line),"%s %s %s",v.linked?"蓝牙已连":"蓝牙待连",v.wifi?"联网":"离线",v.night?"夜间":v.dry?"空走":"实绘");label(62,line);
  }else if(currentPage==1){
    label(12,"温湿度与光敏");
    const char *status=reading.status(millis());
    if(!strcmp(status,"valid")){snprintf(line,sizeof(line),"%.1f C   %.1f %%",reading.temperature,reading.humidity);label(30,line);}
    else label(30,!strcmp(status,"stale")?"温湿度已过期":!strcmp(status,"waiting")?"温湿度等待采样":"温湿度读取失败");
    snprintf(line,sizeof(line),"DO:%u %s",lightRaw(),lightSignal.verified()?(lightSignal.dark(v.darkLow)?"暗光":"亮光"):"待遮光测试");label(46,line);
    snprintf(line,sizeof(line),"灯带:%s %s",strip?"开":"关",v.night?"夜间":v.ambient&&!stripOverride?(lightSignal.verified()?"自动":"未验证"):"手动");label(62,line);
  }else{
    label(12,"任务与自动绘时");
    const char *stage=v.stage==static_cast<unsigned>(daily::Stage::Complete)?"绘制已完成":v.stage==static_cast<unsigned>(daily::Stage::Stopped)?"任务已中止":v.stage==static_cast<unsigned>(daily::Stage::Preparing)?"准备绘制":"待机";
    label(30,stage);
    if(v.needsHome)label(46,"请在手机确认归位");
    else if(v.nextAuto!=0xffffffffU){snprintf(line,sizeof(line),"下次 %u分%02u秒后",v.nextAuto/60,v.nextAuto%60);label(46,line);}
    else label(46,v.clock?"等待手动任务":"连接手机校时");
    label(62,v.night?"夜间自动暂停":v.automatic?"自动绘时开启":"自动绘时暂停");
  }
}
bool rowsChanged() {
  for(unsigned i=0;i<4;++i)
    if(rows[i].y!=previousRows[i].y||rows[i].large!=previousRows[i].large||strcmp(rows[i].text,previousRows[i].text))return true;
  return false;
}
void renderPart(bool idle) {
  const uint32_t started=micros();
  // During motion rasterize just one UTF-8 glyph per granted slot. The full
  // frame remains private until all rows are ready; no mixed page is sent.
  do {
    if(renderRow>=rowCount){decorateFrame();rendering=false;flushAt=0;windowReady=false;break;}
    const auto &row=rows[renderRow];
    if(!row.text[renderByte]){++renderRow;renderByte=0;renderX=0;continue;}
    const uint8_t first=static_cast<uint8_t>(row.text[renderByte]);
    unsigned n=first<0x80?1:first<0xe0?2:first<0xf0?3:4;
    char glyph[5]{};
    for(unsigned i=0;i<n&&row.text[renderByte];++i)glyph[i]=row.text[renderByte++];
    oled.setFont(row.large?u8g2_font_logisoso24_tf:u8g2_font_wqy12_t_gb2312);
    renderX+=oled.drawUTF8(renderX,row.y,glyph);
    if(!idle)break;
  }while(true);
  const uint32_t elapsed=micros()-started;
  if(elapsed>stats.maxRenderUs)stats.maxRenderUs=elapsed;
}
void finishFrame() {
  ++stats.frames;failureStreak=0;displayedValid=true;fullFlush=false;
}
}
void begin() {
  visual.begin(millis());
  Preferences displayPrefs;
  if(displayPrefs.begin("jc_display",true)){
    visual.enabled=displayPrefs.getBool("animation",true);
    visual.sleepSeconds=displayPrefs.getUInt("sleep",120);
    visual.brightness=displayPrefs.getUInt("brightness",50);displayPrefs.end();
    if(visual.sleepSeconds>3600||(visual.sleepSeconds&&visual.sleepSeconds<15))visual.sleepSeconds=120;
    if(visual.brightness<5||visual.brightness>100)visual.brightness=50;
  }
  pinMode(config::LEFT_BUTTON,INPUT_PULLUP);pinMode(config::RIGHT_BUTTON,INPUT_PULLUP);
  left.begin(millis(),digitalRead(config::LEFT_BUTTON)==LOW);right.begin(millis(),digitalRead(config::RIGHT_BUTTON)==LOW);
  if(config::STRIP_OUTPUT_ENABLED){digitalWrite(config::STRIP,LOW);pinMode(config::STRIP,OUTPUT);}
  else pinMode(config::STRIP,INPUT);
  pinMode(config::LIGHT_DO,config::LIGHT_DO_PULLUP?INPUT_PULLUP:INPUT);pinMode(config::DHT_PIN,INPUT_PULLUP);
  stats.lightHigh=lightRaw();stats.lightChangedAt=millis();
  Wire.begin(config::OLED_SDA,config::OLED_SCL,displayBusHz);Wire.setTimeOut(config::OLED_TIMEOUT_MS);
  initDisplay();reading.lastOk=true;nextDht=millis()+2500;
}
bool leftPress(){return left.poll(millis(),digitalRead(config::LEFT_BUTTON)==LOW);}
bool rightPress(){const bool pressed=right.poll(millis(),digitalRead(config::RIGHT_BUTTON)==LOW);if(pressed)++stats.rightPresses;return pressed;}
bool setStrip(bool on){
  if(on&&(!config::STRIP_OUTPUT_ENABLED||nightActive))return false;
  stripWanted=on;stripOverride=true;
  if(strip!=on){strip=on;if(config::STRIP_OUTPUT_ENABLED)digitalWrite(config::STRIP,on?HIGH:LOW);lastFrame=0;}
  return true;
}
bool stripOn(){return strip;}
unsigned page(){return currentPage;}
void setPage(unsigned next){if(next<3&&next!=currentPage){currentPage=next;frameDirty=true;captureSlide=true;visual.wake(millis());}}
void nextPage(){setPage((currentPage+1)%3);}
bool oledOk(){return displayOk;}
bool lightRaw(){return digitalRead(config::LIGHT_DO)==HIGH;}
bool lightStable(){return lightSignal.stable;}
bool lightVerified(){return lightSignal.verified();}
unsigned lightAge(){return (millis()-lightSignal.stableAt)/1000;}
void suppressSideKeys(){left.begin(millis(),digitalRead(config::LEFT_BUTTON)==LOW);right.begin(millis(),digitalRead(config::RIGHT_BUTTON)==LOW);}
const Diagnostics &diagnostics(){return stats;}
const boardlogic::Sample &sample(){return reading;}
void notify(oledmotion::Notice n){visual.post(n,millis());}
void getDisplaySettings(bool &animation,unsigned &sleep,unsigned &brightness){animation=visual.enabled;sleep=visual.sleepSeconds;brightness=visual.brightness;}
bool displaySettings(bool animation,unsigned sleep,unsigned brightness){
  if(sleep>3600||(sleep&&sleep<15)||brightness<5||brightness>100)return false;
  Preferences p;if(!p.begin("jc_display",false))return false;
  bool saved=p.putBool("animation",animation)==1&&p.putUInt("sleep",sleep)==4&&p.putUInt("brightness",brightness)==4;p.end();
  if(!saved)return false;
  visual.enabled=animation;visual.sleepSeconds=sleep;visual.brightness=brightness;visual.wake(millis());frameDirty=true;return true;
}
bool wakeOnKey(){
  const bool middle=digitalRead(config::BUTTON)==LOW;
  const bool any=middle||digitalRead(config::LEFT_BUTTON)==LOW||digitalRead(config::RIGHT_BUTTON)==LOW;
  if((visual.sleeping||visual.visibility<0.1f)&&any){
    visual.wake(millis());wakeConsumed=true;
    left.begin(millis(),digitalRead(config::LEFT_BUTTON)==LOW);right.begin(millis(),digitalRead(config::RIGHT_BUTTON)==LOW);
  }
  if(wakeConsumed){if(!any)wakeConsumed=false;return true;}return false;
}
void tick(const View &view,bool allowSampling,bool allowDisplay) {
  const uint32_t sampledNow=millis();
  const bool middle=digitalRead(config::BUTTON)==LOW;
  const bool any=middle||digitalRead(config::LEFT_BUTTON)==LOW||digitalRead(config::RIGHT_BUTTON)==LOW;
  visual.update(view,sampledNow,middle,any);
  if(view.otaStage!=lastOtaStage){
    if(view.otaStage==6)notify(oledmotion::Notice::Error);
    if(view.otaStage==7)notify(oledmotion::Notice::Stopped);
    lastOtaStage=view.otaStage;
  }
  const bool high=lightRaw();if(high!=stats.lightHigh){stats.lightHigh=high;stats.lightChangedAt=millis();++stats.lightChanges;}
  lightSignal.update(high,sampledNow);nightActive=view.night;
  if(ambientRevision!=view.policyRevision||ambientActive!=view.ambient){stripOverride=false;ambientRevision=view.policyRevision;ambientActive=view.ambient;}
  bool wanted=stripWanted;
  if(lightSignal.verified()&&sampledNow-lightSignal.stableAt>=2000)ambientDark=lightSignal.dark(view.darkLow);
  if(view.ambient&&!stripOverride&&lightSignal.verified()){
    wanted=strip;
    if(sampledNow-lightSignal.stableAt>=2000)wanted=ambientDark;
  }
  wanted=wanted&&!nightActive&&config::STRIP_OUTPUT_ENABLED;
  if(wanted!=strip){strip=wanted;digitalWrite(config::STRIP,wanted?HIGH:LOW);frameDirty=true;}
  const int layout=view.menu?8:view.ota?3:view.fault?4:view.install?5:view.timerActive?6:view.moving?7:currentPage;
  if(layout!=frameLayout||view.menu&&(strcmp(view.menuTitle,renderView.menuTitle)||strcmp(view.menuName,renderView.menuName)||strcmp(view.menuValue,renderView.menuValue))){frameDirty=true;}
  // Finish an in-flight DHT capture, but defer starting one during page changes.
  if(dhtState!=DhtState::Idle||!displayOk||(!frameDirty&&!rendering&&screenOn&&flushAt==1024&&!visualRunning(view,sampledNow)))dhtTick(allowSampling);
  // Motion grants >=2ms. Each motion tick sends only one I2C transaction;
  // its timeout is 2ms, so addressing and data never consume the same slot.
  if(!allowDisplay||dhtState!=DhtState::Idle)return;
  // 400kHz shortens the visible update window. Idle sends at most two
  // 64-byte rectangles per tick; motion retains one <=17-byte transaction.
  // A bus error retries at 200kHz rather than repeatedly using the fast clock.
  Wire.setTimeOut(allowSampling?config::OLED_TIMEOUT_MS:config::OLED_MOTION_TIMEOUT_MS);
  uint32_t now=millis();
  if(!displayOk){
    if(allowSampling&&static_cast<int32_t>(now-retryDisplayAt)>=0){
      Wire.end();Wire.begin(config::OLED_SDA,config::OLED_SCL,displayBusHz);Wire.setTimeOut(config::OLED_TIMEOUT_MS);initDisplay();
    }
    return;
  }
  const bool complete=!rendering&&flushAt==1024;
  const uint32_t flags=(visual.noticeVisible(now)?1U:0U)|((visual.enabled&&now-visual.bootAt<1050)?2U:0U)|
    (visual.pressed?4U:0U)|(view.networkBusy?8U:0U)|(view.syncing?16U:0U)|(visual.sleeping?32U:0U)|
    (view.poseB?64U:0U)|(view.night?128U:0U)|(view.otaStage<<8)|(view.stage<<16);
  if(flags!=renderedFlags)frameDirty=true;
  if(complete&&visual.sleeping&&visual.visibility==0&&renderedVisibility==0){
    if(screenOn){const uint8_t off[]={0,0xae};if(busWrite(off,sizeof(off)))screenOn=false;}
    return;
  }
  unsigned brightness=visual.brightness;
  if(view.night&&brightness>view.nightBrightness)brightness=view.nightBrightness;
  else if(view.ambient&&lightSignal.verified()&&ambientDark&&brightness>20)brightness=20;
  int contrast=int(brightness*255U/100*visual.visibility);
  if(complete&&contrast!=visualContrast){
    const uint8_t cmd[]={0,0x81,static_cast<uint8_t>(contrast)};
    if(busWrite(cmd,sizeof(cmd)))visualContrast=contrast;return;
  }
  bool animate=visualRunning(view,now);
  unsigned interval=animate?(view.moving?160:24):250;
  if(complete&&(frameDirty||(screenOn&&(lastFrame==0||now-lastFrame>=interval)))){
    prepareVisual(view,now);renderedFlags=flags;
    prepareRows(view);lastFrame=now;
    if(!frameDirty&&!rowsChanged()&&!animate&&now-numberAt>=350&&visual.visibility==1){++stats.unchangedFrames;return;}
    for(unsigned i=0;i<4;++i)previousRows[i]=rows[i];
    oled.clearBuffer();renderRow=renderByte=renderX=0;rendering=true;
    fullFlush=!displayedValid;
    flushAt=1024;windowReady=false;frameDirty=false;frameLayout=layout;
    // Keep the previous coherent page visible while constructing its successor.
    if(allowSampling)renderPart(true);
    return;
  }
  if(rendering){renderPart(allowSampling);return;}
  if(blankForSwitch&&screenOn){
    const uint8_t off[]={0,0xae};if(!busWrite(off,sizeof(off)))return;
    screenOn=false;blankForSwitch=false;return;
  }
  blankForSwitch=false;
  if(flushAt<1024){
    const uint8_t *buffer=oled.getBufferPtr();
    const uint32_t started=micros();
    unsigned bursts=0,scanned=0;
    do {
      if(!windowReady){
        windowX=flushAt/8;
        windowWidth=allowSampling?8:2;
        if(windowWidth>128-windowX)windowWidth=128-windowX;
        windowFirst=8;windowLast=0;
        for(unsigned p=0;p<8;++p)for(unsigned x=windowX;x<windowX+windowWidth;++x){
          const unsigned offset=p*128+x;
          if(fullFlush||buffer[offset]!=displayed[offset]){
            if(p<windowFirst)windowFirst=p;
            if(p>windowLast)windowLast=p;
          }
        }
        ++scanned;
        if(windowFirst==8){
          stats.skippedBytes+=windowWidth*8;flushAt+=windowWidth*8;
          if(flushAt==1024){finishFrame();return;}
          if(!allowSampling)return;
          continue;
        }
        // Vertical addressing: page advances first, then column. A narrow
        // strip is sent through all affected rows, avoiding row-by-row splits.
        const uint8_t window[]={0,0x21,windowX,static_cast<uint8_t>(windowX+windowWidth-1),0x22,windowFirst,windowLast};
        if(!busWrite(window,sizeof(window)))return;
        windowReady=true;
        if(!allowSampling)return;
      }
      uint8_t chunk[65];unsigned count=0;chunk[0]=0x40;
      for(unsigned x=windowX;x<windowX+windowWidth;++x)
        for(unsigned p=windowFirst;p<=windowLast;++p)chunk[++count]=buffer[p*128+x];
      if(!busWrite(chunk,count+1))return;
      for(unsigned x=windowX;x<windowX+windowWidth;++x)
        for(unsigned p=windowFirst;p<=windowLast;++p)displayed[p*128+x]=buffer[p*128+x];
      stats.dataBytes+=count;flushAt+=windowWidth*8;windowReady=false;++bursts;
      if(flushAt==1024){finishFrame();return;}
      // Finish any already-addressed rectangle even if the motion grant has
      // changed; its size was fixed when the address command was sent.
    }while(allowSampling&&bursts<2&&scanned<16&&micros()-started<2500);
    return;
  }
  if(!screenOn&&visual.visibility>0){const uint8_t on[]={0,0xaf};if(busWrite(on,sizeof(on)))screenOn=true;}
}
}
