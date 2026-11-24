#include <Arduino.h>
#include <esp_arduino_version.h>
#include <WiFi.h>
#include <Preferences.h>
#include <time.h>
#include <algorithm>
#include <utility>
#include <atomic>
#include "Firmware.h"
#include "Config.h"
#include "Drawing.h"
#include "MotionExecutor.h"
#include "Controls.h"
#include "BleLink.h"
#include "Protocol.h"
#include "Settings.h"
#include "DailyPolicy.h"
#include "Sound.h"
#include "NetworkConfig.h"
#include "Board.h"
#include "Ota.h"
#include "OtaPolicy.h"
#include "Version.h"
#include "UpgradeLight.h"
#include "WifiScan.h"
#include <sys/time.h>
#if !defined(CONFIG_IDF_TARGET_ESP32S3)
#error "This upgrade workcopy targets ESP32-S3 N16R8. Use the original project for C3."
#endif

namespace {
using namespace clockwork;
Calibration calibration,savedCalibration;
Settings settings;
daily::Config dailyConfig;
daily::Requests dailyRequests;
daily::Stage taskStage=daily::Stage::Idle;
bool needsHome=false;
bool dailyNight();
unsigned nextAutomatic();
daily::Stage currentStage();
void readDaily();
void localSettingsTick();
void closeMenu(bool saved);
bool localMenuActive();
bool localSettingsKeys();
bool openLocalMenu();
void sendReply(const String &line){dailyRequests.record(line.c_str());blelink::send(line);}
Path favoritePath;
bool plansArmed=true;
uint8_t pomoPhase=0,pomoCycle=0;
int64_t checkedPlanMinute=-1;
String taskName="idle";
uint32_t taskSerial=0;
bool jobActive=false,timerFinishPending=false;
bool validationAborted=false;
Preferences prefs;
String storedSsid, storedPass, errorMessage;
bool calibrationMode=false, calibrationHalf=false, autoDraw=true, fault=false;
bool clockReady=false, ledOn=false, servoReady=false;
bool restartOnRelease=false;
bool dryRun=true,quiet=false,remoteJob=false,bleReady=false;
bool lightMonitor=false;
uint32_t lastLightLog=0;
unsigned litStepMs=4;
uint32_t manualLightUntil=0,countdownEnd=0,countdownDrawAt=0,uploadAt=0;
bool countdownActive=false;
Path uploadPath;
size_t uploadExpected=0;
uint32_t lastState=0;
ButtonLogic button;
void enterCalibration();
void selectAlignmentPose(bool poseB);
void stopRemote();
void auxiliaryButtons();
void boardTick();
void cancelWifiScan();
bool executeAction(unsigned action,bool fromPhone=false);
bool startTimer(bool pomodoro,unsigned seconds=0);
bool saveSettings(const Settings &next);
void notifyDone(const char *reason);
void eventSound(SoundEvent event);
bool soundAlert();
void soundChime(unsigned hour);
bool localClock(tm &t);
uint32_t restartAt=0, networkAt=0, lastSyncAttempt=0;
int64_t lastMinute=-1;
String wifiState="unconfigured";
enum class Network { Off, Connecting, Syncing };
Network network=Network::Off;
std::atomic<bool> timeWasSynced{false};

bool drawPwmReady=false;
void light(bool on,unsigned power=255) {
  ledOn=config::DRAW_LED_DRIVE_ENABLED&&drawPwmReady&&on&&!dryRun&&power>0;
  if(config::DRAW_LED_DRIVE_ENABLED){
#if ESP_ARDUINO_VERSION_MAJOR >= 3
    if(drawPwmReady)ledcWrite(config::DRAW_LED,ledOn?std::min(power,255U):0);
#else
    if(drawPwmReady)ledcWrite(config::DRAW_PWM_CHANNEL,ledOn?std::min(power,255U):0);
#endif
    else digitalWrite(config::DRAW_LED,LOW);
  }
}
void indicator(bool on) { if(config::STATUS_LED>=0)digitalWrite(config::STATUS_LED,on ? LOW : HIGH); }

bool beginServos() {
  if (servoReady) return true;
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  bool left=ledcAttachChannel(config::LEFT_SERVO,config::SERVO_HZ,config::SERVO_BITS,config::LEFT_PWM_CHANNEL);
  bool right=ledcAttachChannel(config::RIGHT_SERVO,config::SERVO_HZ,config::SERVO_BITS,config::RIGHT_PWM_CHANNEL);
  servoReady=left && right;
#else
  ledcSetup(0,50,14); ledcSetup(1,50,14);
  ledcAttachPin(config::LEFT_SERVO,0); ledcAttachPin(config::RIGHT_SERVO,1);
  servoReady=true;
#endif
  if (!servoReady) { fault=true; errorMessage="无法初始化舵机 PWM"; }
  return servoReady;
}
bool writePulses(Pulses p) {
  if (p.left<PULSE_MIN || p.left>PULSE_MAX || p.right<PULSE_MIN || p.right>PULSE_MAX) return false;
  if (!beginServos()) return false;
  uint32_t l=static_cast<uint32_t>(p.left*config::SERVO_MAX_DUTY/config::SERVO_PERIOD_US);
  uint32_t r=static_cast<uint32_t>(p.right*config::SERVO_MAX_DUTY/config::SERVO_PERIOD_US);
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  return ledcWrite(config::LEFT_SERVO,l) && ledcWrite(config::RIGHT_SERVO,r);
#else
  ledcWrite(0,l); ledcWrite(1,r); return true;
#endif
}

class Motion {
 public:
  double x=HOME_X,y=HOME_Y;
  bool busy() const { return executor.busy(); }
  bool peripheralSlot() const { return !busy() || static_cast<int32_t>(executor.nextAt()-millis())>=3; }
  unsigned progress() const { return totalMs?std::min<uint64_t>(99,(completedMs+executor.elapsed())*100/totalMs):0; }
  bool returningHome() const {return busy()&&executor.index()+1==path.size()&&!path.back().lit&&path.back().x==HOME_X&&path.back().y==HOME_Y;}
  unsigned eta() const {const auto done=completedMs+executor.elapsed();return totalMs>done?(totalMs-done+999)/1000:0;}
  unsigned pass() const { return repeatIndex+1; }
  bool start(Path next,unsigned repeats=0) {
    light(false);
    // Validate every interpolated step before starting either servo.
    validationAborted=false;
    auto proceed=[]() {
      delay(1);
      auxiliaryButtons();
      static uint32_t shown=0;
      if(millis()-shown>=32){boardTick();blelink::tick();shown=millis();}
      // Validation may take longer than one loop; keep the physical stop available.
      if(digitalRead(config::BUTTON)==LOW){validationAborted=true;button.begin(millis(),true);return false;}
      return !blelink::interrupted(remoteJob && !countdownActive);
    };
    if (!validatePath(next,x,y,calibration,proceed)) {
      if (validationAborted) { stopRemote(); }
      else if (blelink::interrupted(remoteJob && !countdownActive)) {cancel();taskStage=daily::Stage::Stopped;}
      else fail("绘制路径不可达或脉宽超限，请检查校准参数");
      return false;
    }
    repeatCount=repeats?repeats:settings.repeats;repeatIndex=0;
    if(repeatCount>1&&!validatePath(next,HOME_X,HOME_Y,calibration,proceed)){
      if(validationAborted)stopRemote();else cancel();return false;
    }
    taskStage=taskName=="home"?daily::Stage::Homing:daily::Stage::Drawing;
    executor.cancel();path=std::move(next);completedMs=0;
    // Estimate repeat cycles separately: the first pass may start elsewhere.
    executor.begin(path,HOME_X,HOME_Y,litStepMs,millis());
    const auto cycle=executor.duration();
    executor.begin(path,x,y,litStepMs,millis());
    totalMs=executor.duration()+cycle*(repeatCount-1);
    return true;
  }
  void cancel() { light(false);executor.cancel();path.clear();totalMs=completedMs=0; }
  void tick() {
    if(!busy())return;
    MotionExecutor::Frame frame;
    if(executor.poll(millis(),frame)){
      // Blank before the next dark movement, including on a failed output.
      if(!frame.lit)light(false);
      if(frame.position){
        Pulses pulses;
        if(!solve(frame.x,frame.y,calibration,pulses)||!writePulses(pulses)){fail("舵机输出失败，绘制已停止");return;}
        x=frame.x;y=frame.y;
      }
      if(frame.lit&&config::DRAW_LED_DRIVE_ENABLED&&!drawPwmReady&&!dryRun){fail("绘制灯 PWM 初始化失败");return;}
      light(frame.lit,frame.power);
    }
    if(!executor.busy()){
      light(false);completedMs+=executor.duration();
      if(++repeatIndex<repeatCount)executor.begin(path,x,y,litStepMs,millis());
      else {
        executor.cancel();path.clear();
        if(jobActive){jobActive=false;remoteJob=false;if(timerFinishPending){timerFinishPending=false;taskName="finished";notifyDone("timer");}else notifyDone("motion");}
      }
    }
  }
  void fail(const char *reason) {
    bool first=!fault;cancel();timerFinishPending=false; fault=true; autoDraw=false; jobActive=false; taskName="fault";needsHome=true;taskStage=daily::Stage::Error; errorMessage=reason; Serial.println(reason);if(first)eventSound(SoundEvent::Error);
  }
 private:
  Path path;MotionExecutor executor;
  unsigned repeatCount=1,repeatIndex=0;
  uint64_t totalMs=0,completedMs=0;
} motion;

void notifyDone(const char *reason) {taskStage=daily::Stage::Complete;needsHome=false; if(!strcmp(reason,"timer"))board::notify(oledmotion::Notice::TimerDone);else if(taskName!="home"&&!countdownActive)board::notify(oledmotion::Notice::DrawDone); sendReply(String("0|DONE|")+reason);if(!strcmp(reason,"timer"))eventSound(SoundEvent::Timer);else if(!autoDraw&&taskName!="home"&&!calibrationMode)eventSound(SoundEvent::Drawing); }
#include "Sound.inc"
void markTask(const char *name) {taskStage=daily::Stage::Preparing; if(strcmp(name,"home")&&strcmp(name,"timer")&&strcmp(name,"focus"))board::notify(oledmotion::Notice::DrawStart); taskName=name; ++taskSerial; jobActive=true; }
void goHome() { markTask("home"); if(!motion.start({{HOME_X,HOME_Y,0,false}},1))jobActive=false; }
void finishTimer(){countdownActive=false;remoteJob=false;goHome();timerFinishPending=!fault&&motion.busy();}
bool saveSettings(const Settings &next) {
  if(!next.valid()||!prefs.begin("jc3",false))return false;
  bool ok=prefs.putBytes("settings",&next,sizeof(next))==sizeof(next);prefs.end();
  if(ok){settings=next;litStepMs=settings.speed;}return ok;
}
void readExtras() {
  if(prefs.begin("jc3",true)){
    Settings candidate;
    if(prefs.getBytesLength("settings")==sizeof(candidate)&&prefs.getBytes("settings",&candidate,sizeof(candidate))==sizeof(candidate)&&candidate.valid())settings=candidate;
    size_t bytes=prefs.getBytesLength("favorite");
    if(bytes>=10&&bytes<=2560&&bytes%5==0){
      std::vector<uint8_t> data(bytes);prefs.getBytes("favorite",data.data(),bytes);
      Path loaded;bool valid=true;
      for(size_t i=0;i<bytes;i+=5){unsigned x=data[i]|data[i+1]<<8,y=data[i+2]|data[i+3]<<8;unsigned lit=data[i+4];if(x<600||x>7200||y<900||y>3600||lit>1){valid=false;break;}loaded.push_back({x/100.f,y/100.f,0,lit!=0});}
      if(valid){loaded.front().lit=false;loaded.push_back({HOME_X,HOME_Y,0,false});favoritePath=std::move(loaded);}
    }
    prefs.end();
  }
  savedCalibration=calibration;litStepMs=settings.speed;autoDraw=settings.autoEnabled;readSounds();
}

void readConfig() {
  prefs.begin("wifi_cfg",true);
  storedSsid=prefs.getString("ssid",""); storedPass=prefs.getString("pass","");
  dryRun=prefs.getBool("dry",true); quiet=prefs.getBool("quiet",false);
  calibration.leftZero=prefs.getInt("slz",1730); calibration.leftScale=prefs.getInt("sls",615);
  calibration.rightZero=prefs.getInt("srz",825); calibration.rightScale=prefs.getInt("srs",590);
  prefs.end();
  if (!calibration.valid()) { calibration=Calibration{}; Serial.println("Invalid NVS calibration; using defaults."); }
  NetworkConfig stored;
  if(prefs.begin("jc3",true)){
    if(prefs.getBytesLength("network")==sizeof(stored) && prefs.getBytes("network",&stored,sizeof(stored))==sizeof(stored) && stored.valid()){
      storedSsid=stored.ssid;storedPass=stored.password;
    }
    prefs.end();
  }
  readExtras();readDaily();
}
#include "Network.inc"

bool localClock(tm &t) {
  time_t now=time(nullptr);
  if (!clockReady || now<1700000000) return false;
  localtime_r(&now,&t); return true;
}
void drawTime() {
  tm t{};
  if (!localClock(t)) return;
  markTask("time"); if(!motion.start(timePath(t.tm_hour,t.tm_min)))jobActive=false; lastMinute=time(nullptr)/60;
}
void drawDate() {
  tm t{};
  if (localClock(t)) { markTask("date"); if(!motion.start(datePath(t.tm_mon+1,t.tm_mday,t.tm_wday)))jobActive=false; lastMinute=time(nullptr)/60; }
}
void selectAlignmentPose(bool poseB) {
  if (!calibrationMode) return;
  motion.cancel();
  Pulses p;
  if (!alignmentPose(calibration,poseB,p) || !writePulses(p)) { motion.fail("安装模式脉宽超限或 PWM 输出失败"); return; }
  light(!poseB); calibrationHalf=!poseB;
  Serial.printf("INSTALL %c: left=%d us, right=%d us; LED=%s; button GPIO%u=%d\n",
    poseB ? 'B' : 'A',p.left,p.right,poseB ? "OFF" : "ON",config::BUTTON,digitalRead(config::BUTTON));
}
void enterCalibration() {
  stopRemote(); calibrationMode=true; restartOnRelease=false;
  if(network!=Network::Off){stopNetwork();wifiState="paused";sendWifi();}
  button.begin(millis(),digitalRead(config::BUTTON)==LOW);
  // Original instructions use a flash to confirm entry; make this visible on both lamps.
  for (unsigned i=0;i<3;++i) {
    indicator(true); light(true); delay(100);
    indicator(false); light(false); delay(100);
  }
  Serial.println("INSTALL MODE: holding pose A. Click=alternate, 1=A, 2=B, x=exit; no clock drawing.");
  selectAlignmentPose(false);
}
void buttonAction(unsigned action){if(executeAction(action))eventSound(SoundEvent::Button);else {eventSound(SoundEvent::Error);board::notify(oledmotion::Notice::Error);}}
void singleClick() {
  if(calibrationMode){selectAlignmentPose(calibrationHalf);return;}
  buttonAction(settings.keys[0]);
}
void doubleClick() { if(!calibrationMode)buttonAction(settings.keys[1]); }
void longPress() {
  if(calibrationMode){light(false);restartOnRelease=true;return;}
  stopRemote();connectNetwork();
}
void auxiliaryButtons() {
  if(board::leftPress()) {
    if(!board::setStrip(!board::stripOn())){board::notify(oledmotion::Notice::Error);sendReply(dailyNight()?"0|ERR|NIGHT_QUIET":"0|ERR|STRIP_UNVERIFIED");}
  }
  if(board::rightPress())board::nextPage();
}
void buttonTick() {
  static uint32_t wakingHoldAt=0;
  static bool wakingHold=false,wakingMenu=false;
  if(board::wakeOnKey()){
    bool middle=digitalRead(config::BUTTON)==LOW;
    if(middle&&!wakingHold){wakingHold=true;wakingHoldAt=millis();}
    if(middle&&!wakingMenu&&millis()-wakingHoldAt>=5000){wakingMenu=true;openLocalMenu();}
    if(!middle){wakingHold=false;wakingMenu=false;}
    button.begin(millis(),middle);return;
  }
  wakingHold=wakingMenu=false;
  if(localSettingsKeys()){button.begin(millis(),digitalRead(config::BUTTON)==LOW);return;}
  auxiliaryButtons();
  bool busy=motion.busy()||countdownActive||uploadExpected||manualLightUntil||soundPlayer.busy()||wifiscan::busy();
  switch(button.poll(millis(),digitalRead(config::BUTTON)==LOW,calibrationMode,busy)){
    case ButtonEvent::Stop: stopRemote();break;
    case ButtonEvent::Single:singleClick();break;
    case ButtonEvent::Double:doubleClick();break;
    case ButtonEvent::Triple:buttonAction(settings.keys[2]);break;
    case ButtonEvent::Quad:buttonAction(settings.keys[3]);break;
    case ButtonEvent::Long:if(calibrationMode)longPress();else buttonAction(settings.keys[4]);break;
    case ButtonEvent::VeryLong:if(!openLocalMenu())board::notify(oledmotion::Notice::Error);break;
    default:break;
  }
}

void serialTick() {
  // A continuous stream must not monopolize the loop and delay keys/servos.
  for (unsigned budget=0;budget<8&&Serial.available();++budget) {
    char c=Serial.read();
    if(wifiscan::busy()&&c!='s'&&c!='?')continue;
    if (c=='c') enterCalibration();
    else if (c=='1' || c=='2') { if (!calibrationMode) enterCalibration(); selectAlignmentPose(c=='2'); }
    else if (c=='x' && calibrationMode) { light(false); restartAt=millis()+200; }
    else if (c=='t') singleClick(); else if (c=='d') doubleClick(); else if (c=='w') longPress();
    else if (c=='s') stopRemote();
    else if (c=='l') {
      lightMonitor=!lightMonitor;
      Serial.printf("LIGHT monitor=%d GPIO%u DO=%d pullup=%d (1s, idle only; unplug DO: expect 1)\n",lightMonitor,config::LIGHT_DO,board::lightRaw(),config::LIGHT_DO_PULLUP);
    }
    else if (c=='?') {
      Serial.printf("mode=%s auto=%d time=%d fault=%d button(GPIO%u)=%d pose=%c\ncal=%d,%d,%d,%d\n",
        calibrationMode ? "calibration" : "clock",autoDraw,clockReady,fault,
        config::BUTTON,digitalRead(config::BUTTON),calibrationMode ? (calibrationHalf ? 'A' : 'B') : '-',
        calibration.leftZero,calibration.leftScale,calibration.rightZero,calibration.rightScale);
      Serial.println(errorMessage);
      Serial.printf("LIGHT GPIO%u DO=%d pullup=%d; OLED ok=%d rotation=%u; strip_enabled=%d\n",config::LIGHT_DO,board::lightRaw(),config::LIGHT_DO_PULLUP,board::oledOk(),config::OLED_ROTATE_180?180:0,config::STRIP_OUTPUT_ENABLED);
      const auto &d=board::diagnostics();
      Serial.printf("DISPLAY page=%u right_presses=%lu frames=%lu i2c_errors=%lu last_error=%u; LIGHT changes=%lu stable_ms=%lu\n",board::page(),static_cast<unsigned long>(d.rightPresses),static_cast<unsigned long>(d.frames),static_cast<unsigned long>(d.i2cErrors),d.lastI2cError,static_cast<unsigned long>(d.lightChanges),static_cast<unsigned long>(millis()-d.lightChangedAt));
      Serial.printf("DISPLAY unchanged_skipped=%lu max_render_us=%lu\n",static_cast<unsigned long>(d.unchangedFrames),static_cast<unsigned long>(d.maxRenderUs));
      Serial.printf("DISPLAY data_bytes=%lu skipped_bytes=%lu\n",static_cast<unsigned long>(d.dataBytes),static_cast<unsigned long>(d.skippedBytes));
    }
  }
  // Diagnostics must not add UART work to the servo stepping path.
  if(lightMonitor&&!motion.busy()&&!uploadExpected&&millis()-lastLightLog>=1000){
    lastLightLog=millis();const auto &d=board::diagnostics();Serial.printf("LIGHT t=%lu GPIO%u DO=%d changes=%lu stable_ms=%lu\n",static_cast<unsigned long>(lastLightLog),config::LIGHT_DO,board::lightRaw(),static_cast<unsigned long>(d.lightChanges),static_cast<unsigned long>(lastLightLog-d.lightChangedAt));
  }
}

void clearUpload() { uploadPath.clear(); uploadExpected=0; uploadAt=0; }
void stopRemote() {
  timerFinishPending=false;if(localMenuActive())closeMenu(false);
  if(motion.busy()||countdownActive||uploadExpected)board::notify(oledmotion::Notice::Stopped);
  needsHome=needsHome||motion.busy();taskStage=daily::Stage::Stopped;
  cancelWifiScan();
  ota::cancel();
  board::setStrip(false);
  motion.cancel(); light(false); manualLightUntil=0; countdownActive=false;
  clearUpload(); stopBeep(); autoDraw=false; remoteJob=false;
  pomoPhase=pomoCycle=0;jobActive=false;taskName="stopped";plansArmed=false;
}
bool manualReady() {
  return !motion.busy() && !countdownActive && !uploadExpected && !needsHome;
}
void pauseForRemote() {
  timerFinishPending=false;if(localMenuActive())closeMenu(false);
  motion.cancel(); countdownActive=false; clearUpload(); manualLightUntil=0;
  autoDraw=false; remoteJob=true; light(false); jobActive=false;pomoPhase=pomoCycle=0;
}
bool leaveInstallation() {
  if (!calibrationMode) return true;
  Pulses home;
  if (!solve(HOME_X,HOME_Y,calibration,home) || !writePulses(home)) return false;
  calibrationMode=false; motion.x=HOME_X; motion.y=HOME_Y; light(false);
  button.begin(millis(),digitalRead(config::BUTTON)==LOW); return true;
}
void sendState(long id=0) {
  String state=String(id)+"|STATE|v=" JIANCLOCK_VERSION ",mode="+(calibrationMode ? "install" : "clock");
  state+=",busy="+String(motion.busy())+",auto="+String(autoDraw)+",light="+String(ledOn);
  state+=",dry="+String(dryRun)+",quiet="+String(quiet)+",clock="+String(clockReady);
  state+=",heap="+String(ESP.getFreeHeap())+",minheap="+String(ESP.getMinFreeHeap());
  state+=",x="+String(motion.x,1)+",y="+String(motion.y,1);
  state+=",slz="+String(calibration.leftZero)+",sls="+String(calibration.leftScale);
  state+=",srz="+String(calibration.rightZero)+",srs="+String(calibration.rightScale);
  state+=",step="+String(litStepMs)+",timer="+String(countdownActive ? remaining(millis(),countdownEnd) : 0);
  state+=",upload="+String(uploadPath.size())+",total="+String(uploadExpected)+",fault="+String(fault);
  state+=",task="+taskName+",job="+String(taskSerial)+",pct="+String(motion.busy()?motion.progress():taskStage==daily::Stage::Complete?100:0)+",eta="+String(motion.eta())+",pass="+String(motion.busy()?motion.pass():0);
  state+=",pose="+String(calibrationMode?(calibrationHalf?"A":"B"):"none")+",wifi="+wifiState;
  state+=",buzz="+String(soundPlayer.busy());
  state+=",phase="+String(pomoPhase)+",cycle="+String(pomoCycle)+",armed="+String(plansArmed);
  state+=",stage="+String(daily::name(currentStage()))+",needhome="+String(needsHome)+",night="+String(dailyNight());
  state+=",board=s3-n16r8,id="+String(blelink::deviceCode());
  sendReply(state);
}
#include "Extended.inc"
#include "Daily.inc"
#include "Board.inc"
#include "Ota.inc"
#include "WifiScan.inc"

void handleRemote(char *line) {
  char original[blelink::MAX_LINE];snprintf(original,sizeof(original),"%s",line);
  protocol::Command command;
  if (!protocol::parse(line,command)) { sendReply("0|ERR|BAD_FRAME"); return; }
  bool readOnly=!strcmp(command.name,"GET")||!strcmp(command.name,"CONFIG")||!strcmp(command.name,"CAPS")||!strcmp(command.name,"ENV")||!strcmp(command.name,"WIFIINFO")||!strcmp(command.name,"RGBINFO")||!strcmp(command.name,"DISPLAY")||!strcmp(command.name,"MOTIONINFO")||!strcmp(command.name,"GETPLAN")||!strcmp(command.name,"SOUNDINFO")||!strcmp(command.name,"DAILY")||!strcmp(command.name,"JOBINFO")||!strcmp(command.name,"LIGHTINFO")||!strcmp(command.name,"OTAINFO");
  if(!readOnly){
    const char *reply=nullptr;auto result=dailyRequests.begin(command.id,original,reply);
    if(result!=daily::Requests::Fresh){
      if(result==daily::Requests::Replay&&reply&&*reply)sendReply(reply);
      else sendReply(String(command.id)+"|ERR|"+(result==daily::Requests::Conflict?"ID_REUSED":"ALREADY_ACCEPTED"));
      return;
    }
  }
  struct RequestEnd { ~RequestEnd(){dailyRequests.end();} } requestEnd;
  auto ok=[&](const String &message="done") { sendReply(String(command.id)+"|OK|"+message); };
  auto fail=[&](const char *message) { board::notify(oledmotion::Notice::Error);sendReply(String(command.id)+"|ERR|"+message); };
  const char *name=command.name; char *args=command.args;
  if(handleOta(command.id,name,args))return;
  if(ota::active() && strcmp(name,"STOP") && strcmp(name,"GET") && strcmp(name,"CAPS") && strcmp(name,"ENV") && strcmp(name,"WIFIINFO") && strcmp(name,"SILENCE") && strcmp(name,"RGBINFO")) { fail("OTA_BUSY");return; }
  if(handleWifiScan(command.id,name,args))return;
  if(wifiscan::busy()&&strcmp(name,"STOP")&&strcmp(name,"GET")&&strcmp(name,"CAPS")&&strcmp(name,"WIFIINFO")&&strcmp(name,"SILENCE")){fail("WIFI_SCAN_BUSY");return;}
  if(!strcmp(name,"RGBINFO")){sendReply(String(command.id)+"|RGB|pin="+String(upgradelight::pin())+",busy="+String(upgradelight::busy()?1:0));return;}
  if(!strcmp(name,"RGBPIN")||!strcmp(name,"RGBTEST")){
    if(!manualReady()||calibrationMode||upgradelight::busy()){fail("BUSY");return;}
    if(!strcmp(name,"RGBPIN")){
      long pin=0;if(!protocol::number(args,48,48,pin)){fail("BAD_VALUE");return;}
      if(!upgradelight::setPin(pin)){fail("SAVE_FAILED");return;}
    }else upgradelight::start();
    ok();return;
  }
  if(handleDaily(command.id,name,args))return;
  if(handleBoard(command.id,name,args))return;
  if(handleSound(command.id,name,args))return;
  long n=0;
  if (!strcmp(name,"GET")) { sendState(command.id); return; }
  if (!strcmp(name,"STOP")) { stopRemote(); ok(); return; }
  if (!strcmp(name,"SYNC")) {
    if (!protocol::number(args,1700000000,2147483647L,n)) { fail("BAD_TIME"); return; }
    timeval tv{static_cast<time_t>(n),0}; settimeofday(&tv,nullptr);
    setenv("TZ","CST-8",1); tzset(); clockReady=true; lastMinute=time(nullptr)/60;
    // Phone synchronization also makes the clock usable without Wi-Fi credentials.
    if(network==Network::Off)lastSyncAttempt=millis();checkedPlanMinute=time(nullptr)/60;board::notify(oledmotion::Notice::Synced);
    ok(); return;
  }
  if(!strcmp(name,"WIFIINFO")){sendWifi(command.id);return;}
  if(!strcmp(name,"WIFISET")){
    if(!manualReady()||calibrationMode){fail("BUSY");return;}
    NetworkConfig next;if(!parseNetwork(args,next)){fail("BAD_WIFI");return;}
    if(!saveNetwork(next)){fail("SAVE_FAILED");return;}
    ok("saved");connectNetwork();return;
  }
  if(!strcmp(name,"WIFIRETRY")){
    if(!manualReady()||calibrationMode){fail("BUSY");return;}
    ok("accepted");connectNetwork();return;
  }
  if(!strcmp(name,"WIFIFORGET")){
    NetworkConfig empty;if(!saveNetwork(empty)){fail("SAVE_FAILED");return;}
    stopNetwork();wifiState="unconfigured";ok();sendWifi();return;
  }
  if (!strcmp(name,"DRY") || !strcmp(name,"QUIET")) {
    if (!protocol::number(args,0,1,n)) { fail("BAD_VALUE"); return; }
    if (!strcmp(name,"DRY")) { dryRun=n; if (dryRun) light(false); }
    else { quiet=n; if (quiet) stopBeep(); }
    if (!prefs.begin("wifi_cfg",false)) { fail("SAVE_FAILED");return; }
    bool saved=prefs.putBool(!strcmp(name,"DRY") ? "dry" : "quiet",n)==1;prefs.end();
    if(saved)ok();else fail("SAVE_FAILED");return;
  }
  if (!strcmp(name,"SPEED")) {
    if(!manualReady()){fail("BUSY");return;}
    if (!protocol::number(args,2,20,n)) { fail("BAD_SPEED"); return; }
    Settings next=settings;next.speed=n;if(saveSettings(next))ok();else fail("SAVE_FAILED");return;
  }
  if (!strcmp(name,"BEEP")) { if (startBeep()) ok(); else fail(quiet ? "QUIET" : soundMuted()?"NIGHT_QUIET":"PWM_FAILED"); return; }
  if (!strcmp(name,"AUTO")) {
    if (!protocol::number(args,0,1,n)) { fail("BAD_VALUE"); return; }
    if (n && (fault || !clockReady || !manualReady() || !leaveInstallation())) { fail("NOT_READY"); return; }
    Settings next=settings;next.autoEnabled=n;if(!saveSettings(next)){fail("SAVE_FAILED");return;}
    autoDraw=n; remoteJob=false; if (n){lastMinute=-1;plansArmed=true;} ok(); return;
  }
  if (!strcmp(name,"INSTALL")) { enterCalibration(); remoteJob=true; ok(); return; }
  if (!strcmp(name,"POSE")) {
    if (!protocol::number(args,0,1,n)) { fail("BAD_POSE"); return; }
    if (!calibrationMode) { fail("INSTALL_FIRST"); return; }
    selectAlignmentPose(n); if (fault) fail("POSE_FAILED"); else ok(); return;
  }
  if (!strcmp(name,"CAL") || !strcmp(name,"CALFAST")) {
    if (!calibrationMode || motion.busy()) { fail("INSTALL_FIRST"); return; }
    long values[4];
    if (!protocol::integers(args,values,4,200,2500)) { fail("BAD_CAL"); return; }
    Calibration c; c.leftZero=values[0]; c.leftScale=values[1]; c.rightZero=values[2]; c.rightScale=values[3];
    Pulses p;
    if (!c.valid() || !alignmentPose(c,false,p) || !alignmentPose(c,true,p) || !solve(HOME_X,HOME_Y,c,p)) { fail("UNREACHABLE"); return; }
    // CALFAST is constant time for live nudges. Every future drawing still validates its full path.
    if(!strcmp(name,"CAL")&&!validatePath(timePath(23,58),HOME_X,HOME_Y,c)){fail("UNREACHABLE");return;}
    calibration=c; fault=false; errorMessage=""; selectAlignmentPose(!calibrationHalf); if(fault)fail("POSE_FAILED");else ok();return;
  }
  if (!strcmp(name,"SAVE")) {
    if(!calibrationMode){fail("INSTALL_FIRST");return;}
    if (!prefs.begin("wifi_cfg",false)) { fail("SAVE_FAILED"); return; }
    bool saved=prefs.putInt("slz",calibration.leftZero)==4;
    saved=(prefs.putInt("sls",calibration.leftScale)==4) && saved;
    saved=(prefs.putInt("srz",calibration.rightZero)==4) && saved;
    saved=(prefs.putInt("srs",calibration.rightScale)==4) && saved;
    prefs.end(); if (saved){savedCalibration=calibration;ok();} else fail("SAVE_FAILED"); return;
  }
  if (!strcmp(name,"HOME") || !strcmp(name,"EXIT")) {
    if(motion.busy()||countdownActive||uploadExpected){fail("BUSY");return;}
    pauseForRemote(); fault=false; errorMessage="";
    if (!leaveInstallation()) { fail("HOME_FAILED"); return; }
    goHome(); if (fault) fail("UNREACHABLE"); else ok(); return;
  }
  if (!strcmp(name,"LED")) {
    if (!manualReady() || !protocol::number(args,0,1,n)) { fail("BUSY"); return; }
    if (n && !config::DRAW_LED_DRIVE_ENABLED) { fail("DRAW_LIGHT_UNVERIFIED"); return; }
    if (n && dryRun) { fail("DRY_RUN"); return; }
    if (n) pauseForRemote();
    light(n); manualLightUntil=n ? millis()+10000 : 0; ok(); return;
  }
  if (!strcmp(name,"TIME") || !strcmp(name,"DATE")) {
    if (!manualReady() || !clockReady) { fail("NOT_READY"); return; }
    if (!leaveInstallation()) { fail("HOME_FAILED"); return; }
    pauseForRemote();
    if (!strcmp(name,"TIME")) drawTime(); else drawDate();
    if (fault) fail("UNREACHABLE"); else ok("accepted"); return;
  }
  if (!strcmp(name,"TEST")) {
    if (!manualReady() || !protocol::number(args,0,4,n)) { fail("BUSY"); return; }
    if (!leaveInstallation()) { fail("HOME_FAILED"); return; }
    pauseForRemote(); markTask("pattern");if (motion.start(patternPath(n))) ok(); else {jobActive=false;fail("UNREACHABLE");} return;
  }
  if (!strcmp(name,"BEGIN")) {
    if (!manualReady() || !protocol::number(args,1,config::MAX_UPLOAD_POINTS,n)) { fail("BUSY"); return; }
    if (!leaveInstallation()) { fail("HOME_FAILED"); return; }
    pauseForRemote(); taskStage=daily::Stage::Uploading;uploadExpected=n; uploadPath.reserve(n+1); uploadAt=millis(); ok(); return;
  }
  if (!strcmp(name,"PTS")) {
    if (!uploadExpected) { fail("NO_UPLOAD"); return; }
    char *separator=strchr(args,';');
    if (!separator) { fail("BAD_POINTS"); return; } *separator++=0;
    if (!protocol::number(args,0,config::MAX_UPLOAD_POINTS,n) || static_cast<size_t>(n)!=uploadPath.size()) { fail("BAD_OFFSET"); return; }
    // Validate a complete batch before appending any point.
    Point batch[12]; size_t count=0;
    while (*separator) {
      if (count>=12) { fail("TOO_MANY"); return; }
      char *next=strchr(separator,';'); if (next) *next++=0;
      long v[3];
      if (!protocol::integers(separator,v,3,0,10000) || v[0]<600 || v[0]>7200 || v[1]<900 || v[1]>3600 || v[2]>1) { fail("BAD_POINTS"); return; }
      batch[count++]={v[0]/100.0f,v[1]/100.0f,0,v[2]!=0};
      if (!next) break; separator=next;
    }
    if (!count || uploadPath.size()+count>uploadExpected) { fail("TOO_MANY"); return; }
    uploadPath.insert(uploadPath.end(),batch,batch+count); uploadAt=millis(); ok(String(uploadPath.size())); return;
  }
  if (!strcmp(name,"RUN")) {
    if (!uploadExpected || uploadPath.size()!=uploadExpected) { fail("INCOMPLETE"); return; }
    uploadPath[0].lit=false; uploadPath.push_back({HOME_X,HOME_Y,0,false});
    Path drawing=std::move(uploadPath); clearUpload();
    markTask("drawing");if (motion.start(std::move(drawing))) ok(); else {jobActive=false;fail("UNREACHABLE");} return;
  }
  if (!strcmp(name,"ABORT")) { clearUpload();taskStage=daily::Stage::Stopped; ok(); return; }
  if (!strcmp(name,"TIMER")) {
    if(!protocol::number(args,1,5999,n)){fail("BAD_TIMER");return;}
    if(startTimer(false,n))ok();else fail("NOT_READY");return;
  }
  if(handleExtended(command.id,name,args))return;
  fail("UNKNOWN_COMMAND");
}
void remoteTick() {
  static bool wasConnected=false;bool linked=blelink::connected();
  if(linked&&!wasConnected){dailyRequests.clear();eventSound(SoundEvent::Connected);sendState();lastState=millis();}
  wasConnected=linked;
  if (blelink::takeDisconnect()) {
    cancelWifiScan();
    if(ota::active())ota::cancel();
    dailyRequests.clear();
    // Validated, accepted jobs belong to the clock and continue without a phone.
    // Incomplete uploads and direct lamp tests have no autonomous lifetime.
    if(uploadExpected){clearUpload();taskStage=daily::Stage::Stopped;}
    if(manualLightUntil){light(false);manualLightUntil=0;}
    remoteJob=false;
  }
  if (blelink::takeStop()) { stopRemote(); sendReply("0|OK|stopped"); }
  char line[blelink::MAX_LINE]; if (blelink::receive(line)) handleRemote(line);
  if (uploadExpected && millis()-uploadAt>15000) { clearUpload();taskStage=daily::Stage::Stopped; sendReply("0|ERR|UPLOAD_TIMEOUT"); }
  if (manualLightUntil && static_cast<int32_t>(millis()-manualLightUntil)>=0) { light(false); manualLightUntil=0; }
  if(!ota::active()&&!wifiscan::busy()){timerTick();scheduleTick();buzzerTick();}
  if (blelink::connected() && millis()-lastState>=2000) { sendState(); lastState=millis(); }
  blelink::tick();
}
}  // namespace

#include <esp_sntp.h>
void clockSetup() {
  Serial.begin(115200);
  pinMode(config::BUTTON,INPUT_PULLUP);
  if(config::DRAW_LED_DRIVE_ENABLED){
    digitalWrite(config::DRAW_LED,LOW);pinMode(config::DRAW_LED,OUTPUT);
#if ESP_ARDUINO_VERSION_MAJOR >= 3
    drawPwmReady=ledcAttachChannel(config::DRAW_LED,config::DRAW_PWM_HZ,config::DRAW_PWM_BITS,config::DRAW_PWM_CHANNEL);
#else
    drawPwmReady=ledcSetup(config::DRAW_PWM_CHANNEL,config::DRAW_PWM_HZ,config::DRAW_PWM_BITS)>0;
    if(drawPwmReady)ledcAttachPin(config::DRAW_LED,config::DRAW_PWM_CHANNEL);
#endif
  }
  else pinMode(config::DRAW_LED,INPUT);
  light(false);
  if(config::STATUS_LED>=0){pinMode(config::STATUS_LED,OUTPUT);indicator(false);}
  pinMode(config::BUZZER,OUTPUT); digitalWrite(config::BUZZER,LOW);
  board::begin();
  delay(100); readConfig();upgradelight::begin();
  sntp_set_time_sync_notification_cb([](struct timeval *) { timeWasSynced=true; });
  Serial.println("JianClock S3 " JIANCLOCK_VERSION " OTA / product V2.0; c=install, 1=A, 2=B, x=exit, t=time, d=date, w=retry Wi-Fi, s=stop, ?=status, l=light monitor");
  Serial.printf("Hold middle FUNCTION button GPIO%u in the next 2.5s for installation.\n",config::BUTTON);
  StartupSelector startup;
  startup.begin(millis(),digitalRead(config::BUTTON)==LOW);
  bool install=config::START_IN_INSTALL_MODE;
  while (!install) {
    auto choice=startup.poll(millis(),digitalRead(config::BUTTON)==LOW);
    if (choice==StartupSelector::Result::Install) { install=true; break; }
    if (choice==StartupSelector::Result::Normal) break;
    if (Serial.available() && Serial.read()=='c') { install=true; break; }
    boardTick();
    indicator((millis()/200)%2); delay(1);
  }
  indicator(false); button.begin(millis(),digitalRead(config::BUTTON)==LOW);
  bleReady=blelink::begin();
  if (install) { enterCalibration(); return; }
  Pulses home;
  if (!solve(HOME_X,HOME_Y,calibration,home) || !writePulses(home)) motion.fail("归位失败，请检查舵机校准");
  connectNetwork();
}
void clockLoop() {
  if(ota::healthyBoot(bleReady)){upgradelight::start();board::notify(oledmotion::Notice::UpgradeDone);}
  upgradelight::tick();
  if(ota::active()){
    if(digitalRead(config::BUTTON)==LOW)stopRemote();
    for(unsigned budget=0;budget<8&&Serial.available();++budget)if(Serial.read()=='s')stopRemote();
    remoteTick();ota::tick();boardTick();delay(1);return;
  }
  ota::tick();
  wifiScanTick();
  buttonTick(); serialTick();
  remoteTick();
  if(ota::active()){boardTick();delay(1);return;}
  if(!wifiscan::busy())networkTick();
  localSettingsTick();
  motion.tick();
  if (!calibrationMode && !fault && autoDraw && !needsHome && clockReady && !motion.busy()&&!wifiscan::busy()) {
    int64_t minute=time(nullptr)/60;
    tm t{};if(!localMenuOpen&&minute!=lastMinute&&localClock(t)&&daily::due(dailyConfig,t.tm_hour*60+t.tm_min)) drawTime();
  }
  boardTick();
  indicator(fault ? ((millis()/150)%2) : calibrationMode ? ((millis()/250)%2) : network!=Network::Off ? ((millis()/500)%2) : clockReady);
  if (restartAt && static_cast<int32_t>(millis()-restartAt)>=0) { light(false); ESP.restart(); }
  if (restartOnRelease && digitalRead(config::BUTTON)==HIGH) { delay(100); ESP.restart(); }
  delay(1);
}
