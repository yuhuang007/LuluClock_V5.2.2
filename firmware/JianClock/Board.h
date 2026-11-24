#pragma once
#include <Arduino.h>
#include "BoardLogic.h"
#include "OledMotion.h"
#include "DailyPolicy.h"

namespace board {
struct View {
  bool install=false,poseB=false,fault=false,clock=false,linked=false,wifi=false;
  bool moving=false,dry=true,automatic=false;
  bool ota=false,timerActive=false,networkBusy=false,syncing=false;
  unsigned otaStage=0,timerPhase=0;
  bool menu=false,night=false,ambient=false,darkLow=false,needsHome=false,menuExitArmed=false;
  unsigned nightBrightness=10,stage=0,nextAuto=0xffffffffU,eta=0;
  uint32_t policyRevision=0;
  char menuTitle[48]{},menuName[48]{},menuValue[48]{};
  char error[64]="",task[24]="";
  unsigned otaProgress=0;
  unsigned progress=0,timer=0;
  char time[12]="--:--",date[20]="未校时";
};
void begin();
void notify(oledmotion::Notice notice);
bool wakeOnKey();
bool displaySettings(bool animation,unsigned sleepSeconds,unsigned brightness);
void getDisplaySettings(bool &animation,unsigned &sleepSeconds,unsigned &brightness);
void tick(const View &view, bool allowSampling, bool allowDisplay);
bool leftPress();
bool rightPress();
void nextPage();
bool setStrip(bool on);
bool stripOn();
unsigned page();
void setPage(unsigned next);
bool oledOk();
bool lightRaw();
bool lightStable();
bool lightVerified();
unsigned lightAge();
void suppressSideKeys();
struct Diagnostics {
  uint32_t rightPresses=0,frames=0,i2cErrors=0,lightChanges=0,lightChangedAt=0;
  uint32_t unchangedFrames=0,maxRenderUs=0;
  uint32_t dataBytes=0,skippedBytes=0;
  uint8_t lastI2cError=0;
  bool lightHigh=false;
};
const Diagnostics &diagnostics();
const boardlogic::Sample &sample();
}
