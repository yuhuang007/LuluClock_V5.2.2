#pragma once
#include <cstdint>
namespace clockwork {
enum class SoundEvent { Button, Drawing, Rest, Focus, Timer, Connected, Error };
enum SoundFlag : uint8_t { KeySound=1, DrawingSound=2, TimerSound=4, ConnectionSound=8, ErrorSound=16 };
struct SoundSettings {
 uint32_t version=1;
 uint8_t flags=DrawingSound|TimerSound|ErrorSound,ring=4,repeats=2,night=0,from=22,to=8;
 bool valid() const {return version==1&&flags<=31&&(ring==1||ring==4||ring==6)&&repeats>=1&&repeats<=3&&night<=1&&from<=23&&to<=23;}
};
inline bool silentHour(unsigned hour,unsigned from,unsigned to){return from==to|| (from<to?hour>=from&&hour<to:hour>=from||hour<to);}
struct Note {uint16_t hz,ms;};
inline constexpr Note sound0[]={{2200,55},{0,35}};
inline constexpr Note sound1[]={{1047,110},{0,50},{1319,110},{0,50},{1568,180},{0,100}};
inline constexpr Note sound2[]={{1568,130},{0,50},{1319,130},{0,50},{1047,230},{0,200}};
inline constexpr Note sound3[]={{1047,130},{0,50},{1319,130},{0,50},{1568,230},{0,200}};
inline constexpr Note sound4[]={{2093,180},{0,90},{1568,180},{0,90},{2093,260},{0,500}};
inline constexpr Note sound5[]={{880,150},{0,80},{659,240},{0,150}};
inline constexpr Note sound6[]={{2000,130},{0,140}};
inline constexpr Note sound7[]={{1319,90},{0,45},{1760,140},{0,100}};
struct Tune {const Note* notes;uint8_t count;};
inline constexpr Tune tunes[]={{sound0,2},{sound1,6},{sound2,6},{sound3,6},{sound4,6},{sound5,4},{sound6,2},{sound7,4}};
// No delays or allocations. Lower priority cues cannot interrupt an alarm.
class SoundPlayer {
 public:
 bool start(unsigned tune,uint32_t now,unsigned repeat=1,unsigned importance=1){
  if(tune>=8||repeat<1||repeat>12||(active&&importance<priority))return false;
  active=true;id=tune;left=repeat;priority=importance;index=0;freq=tunes[id].notes[0].hz;deadline=now+tunes[id].notes[0].ms;return true;
 }
 void stop(){active=false;freq=0;}
 void tick(uint32_t now){
  while(active&&static_cast<int32_t>(now-deadline)>=0){
   if(++index>=tunes[id].count){if(--left)index=0;else{stop();return;}}
   const auto &note=tunes[id].notes[index];freq=note.hz;deadline+=note.ms;
  }
 }
 bool busy()const{return active;}unsigned frequency()const{return freq;}unsigned tone()const{return id;}
 private:
 bool active=false;uint8_t id=0,index=0,left=0,priority=0;unsigned freq=0;uint32_t deadline=0;
};
}
