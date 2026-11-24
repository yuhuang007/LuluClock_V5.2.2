#include "UpgradeLight.h"
#include "Config.h"
#include <Arduino.h>
#include <esp32-hal-rgb-led.h>

namespace upgradelight {
namespace {
uint8_t selected=config::UPGRADE_RGB_PIN,phase=6;
uint32_t changedAt=0;
bool initialized=false;
void show(uint8_t r,uint8_t g,uint8_t b){
  // RMT-backed WS2812 output, separate from servo/buzzer LEDC timers.
  rgbLedWrite(selected,r,g,b);initialized=true;
}
}
void begin(){
  selected=config::UPGRADE_RGB_PIN; // Confirmed physical board; ignore legacy GPIO38 NVS.
  // Ordinary boot does not initialize or flash the RGB light.
}
unsigned pin(){return selected;}
bool busy(){return phase<6;}
bool setPin(unsigned next){
  return next==config::UPGRADE_RGB_PIN&&!busy(); // Compatibility with 4.1.1 clients.
}
void start(){
  if(busy())return;
  phase=0;changedAt=millis();show(config::UPGRADE_RGB_BRIGHTNESS,0,0);
}
void tick(){
  if(!busy())return;
  uint32_t now=millis();
  // 250ms color, 80ms dark gap. No delay() and no catch-up burst.
  if(now-changedAt<(phase%2?80U:250U))return;
  changedAt=now;++phase;
  if(phase>=5)phase=6;
  if(phase==2)show(0,config::UPGRADE_RGB_BRIGHTNESS,0);
  else if(phase==4)show(0,0,config::UPGRADE_RGB_BRIGHTNESS);
  else show(0,0,0);
}
}
