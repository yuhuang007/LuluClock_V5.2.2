#pragma once
#include <cstdint>
namespace clockwork {
// IDs are shared with the Android action picker and schedule editor.
enum Action : uint8_t { Nothing, Time, Date, Favorite, Timer, Auto, Quiet, Dry, Home, Box, Cross, Ellipse, Grid, Heart, Pomodoro, Reminder };
struct Plan { uint8_t enabled=0,hour=9,minute=0,days=127,action=Time; };
struct Settings {
 uint32_t version=3;
 uint16_t speed=4;
 uint8_t repeats=1,keys[5]={Time,Date,Favorite,Timer,Auto};
 uint8_t timerMinutes=25,work=25,rest=5,rounds=4;
 uint8_t chime=0,chimeStart=8,chimeEnd=22,autoEnabled=1;
 Plan plans[4];
 bool valid() const {
  if(version!=3||speed<2||speed>20||repeats<1||repeats>3||timerMinutes<1||timerMinutes>99||work<1||work>99||rest<1||rest>99||rounds<1||rounds>12||chime>1||chimeStart>23||chimeEnd>23||autoEnabled>1)return false;
  for(auto k:keys)if(k>Reminder)return false;
  for(const auto &p:plans)if(p.enabled>1||p.hour>23||p.minute>59||p.days<1||p.days>127||!scheduleAction(p.action))return false;
  return true;
 }
 static bool scheduleAction(unsigned a) { return a==Time||a==Date||a==Favorite||a==Timer||(a>=Box&&a<=Reminder); }
};
inline bool due(const Plan &p,int hour,int minute,int weekday) {
 return p.enabled && p.hour==hour && p.minute==minute && weekday>=0 && weekday<7 && (p.days&(1U<<weekday));
}
inline bool chimeHour(unsigned hour,unsigned start,unsigned end) {
 return start<=end ? hour>=start&&hour<=end : hour>=start||hour<=end;
}
// Monotonic time subtraction works across millis() wrap, intervals are <2^31 ms.
inline uint32_t remaining(uint32_t now,uint32_t end) { int32_t delta=static_cast<int32_t>(end-now);return delta>0?(static_cast<uint32_t>(delta)+999)/1000:0; }
// Advance only after a full phase ends. No rest after the final focus round.
inline bool nextPhase(uint8_t &phase,uint8_t &cycle,uint8_t rounds) {
 if(phase==1&&cycle<rounds){phase=2;return true;}
 if(phase==2){phase=1;++cycle;return true;}
 phase=0;return false;
}
}
