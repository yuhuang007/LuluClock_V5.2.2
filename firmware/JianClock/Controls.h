#pragma once
#include <cstdint>
#include "Config.h"
#include "Geometry.h"

namespace clockwork {
// Do not move or connect Wi-Fi until the installation entry window is resolved.
class StartupSelector {
 public:
  enum class Result { Waiting, Normal, Install };
  void begin(uint32_t now, bool pressed) { started=changed=now; raw=pressed; }
  Result poll(uint32_t now, bool pressed) {
    if (pressed!=raw) { raw=pressed; changed=now; }
    if (raw && now-changed>=config::DEBOUNCE_MS) return Result::Install;
    if (now-started>=config::INSTALL_WINDOW_MS && !raw) return Result::Normal;
    return Result::Waiting;
  }
 private:
  uint32_t started=0,changed=0;
  bool raw=false;
};

enum class ButtonEvent { None, Single, Double, Triple, Quad, Long, VeryLong, Stop };
class ButtonLogic {
 public:
  void begin(uint32_t now,bool pressed) {
    raw=stable=pressed;suppressed=pressed;held=false;clicks=0;changed=downAt=upAt=now;
  }
  ButtonEvent poll(uint32_t now,bool pressed,bool installMode,bool busy=false) {
    if(pressed!=raw){raw=pressed;changed=now;}
    if(now-changed>=config::DEBOUNCE_MS && raw!=stable){
      stable=raw;
      if(suppressed){if(!stable)suppressed=false;return ButtonEvent::None;}
      if(stable){
        downAt=now;held=false;
        if(busy&&!installMode){clicks=0;held=true;suppressed=true;return ButtonEvent::Stop;}
      }else if(!held){
        if(installMode){clicks=0;return ButtonEvent::Single;}
        if(now-downAt>=1500){clicks=0;return ButtonEvent::Long;}
        if(clicks<4)++clicks;upAt=now;
      }
    }
    if(suppressed)return ButtonEvent::None;
    if(raw&&stable&&!held&&now-downAt>=(installMode?config::LONG_PRESS_MS:5000U)){
      held=true;clicks=0;return installMode?ButtonEvent::Long:ButtonEvent::VeryLong;
    }
    // Do not dispatch a preceding click while the next press is still held/debouncing.
    if(!raw&&!stable&&clicks&&now-upAt>=300){
      auto event=clicks==1?ButtonEvent::Single:clicks==2?ButtonEvent::Double:clicks==3?ButtonEvent::Triple:ButtonEvent::Quad;
      clicks=0;return event;
    }
    return ButtonEvent::None;
  }
 private:
  bool raw=false,stable=false,suppressed=false,held=false;
  uint8_t clicks=0;
  uint32_t changed=0,downAt=0,upAt=0;
};

// A = original 7.jpg (lamp ON), B = original 8.jpg (lamp OFF).
inline bool alignmentPose(const Calibration &cal, bool poseB, Pulses &p) {
  if (!cal.valid()) return false;
  p.left=poseB ? static_cast<int>(std::floor(cal.leftZero-cal.leftScale*K_PI/2)) : cal.leftZero;
  p.right=poseB ? cal.rightZero : static_cast<int>(std::floor(cal.rightZero+cal.rightScale*K_PI/2));
  return p.left>=PULSE_MIN && p.left<=PULSE_MAX && p.right>=PULSE_MIN && p.right<=PULSE_MAX;
}
}
