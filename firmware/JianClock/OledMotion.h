#pragma once
#include <cstdint>
#include <cstring>

// Original, hardware-independent animation state. No third-party UI source.
namespace oledmotion {
enum class Notice : uint8_t { None, Connected, Disconnected, Synced, NetworkError,
  DrawStart, DrawDone, TimerDone, Rest, Focus, UpgradeDone, Error, Stopped, SettingsSaved, SettingsCancelled };
inline float unit(uint32_t elapsed,uint32_t duration) {
  return elapsed>=duration?1.f:float(elapsed)/float(duration);
}
inline float ease(float t) { return t*t*(3.f-2.f*t); }
struct Model {
  uint32_t bootAt=0,lastActivity=0,noticeAt=0,holdAt=0,stepAt=0;
  unsigned sleepSeconds=120,brightness=50,timerTotal=0;
  bool enabled=true,initialized=false,linked=false,pressed=false,sleeping=false;
  float visibility=1.f;
  Notice notice=Notice::None;
  void begin(uint32_t now) { bootAt=lastActivity=stepAt=now; }
  void wake(uint32_t now) { lastActivity=now;sleeping=false; }
  void post(Notice n,uint32_t now) { notice=n;noticeAt=now;wake(now); }
  bool noticeVisible(uint32_t now) const { return notice!=Notice::None && now-noticeAt<1800; }
  template<class V> void update(const V &v,uint32_t now,bool middle,bool anyKey) {
    if(initialized&&v.linked!=linked)post(v.linked?Notice::Connected:Notice::Disconnected,now);
    linked=v.linked;initialized=true;
    if(middle&&!pressed)holdAt=now;
    pressed=middle;
    if(anyKey)wake(now);
    if(v.timerActive) { if(v.timer>timerTotal||v.timerPhase!=lastTimerPhase)timerTotal=v.timer; }
    else timerTotal=0;
    lastTimerPhase=v.timerPhase;
    bool critical=v.menu||v.ota||v.fault||v.install||v.moving||v.timerActive||v.networkBusy;
    if(critical)wake(now);
    sleeping=sleepSeconds && !critical && now-lastActivity>=sleepSeconds*1000U;
    uint32_t elapsed=now-stepAt;stepAt=now;
    float delta=float(elapsed>100?100:elapsed)/350.f;
    visibility+=sleeping?-delta:delta;
    if(visibility<0)visibility=0;if(visibility>1)visibility=1;
    if(!enabled)visibility=sleeping?0.f:1.f;
  }
  bool animate(uint32_t now) const {
    return enabled&&(now-bootAt<1100||noticeVisible(now)||pressed||visibility>0&&visibility<1);
  }
  unsigned holdPercent(uint32_t now,bool install) const {
    if(!pressed)return 0;
    uint32_t duration=install?1100:5000;
    uint32_t held=now-holdAt;
    return held>=duration?100:held*100/duration;
  }
 private: unsigned lastTimerPhase=0;
};
}
