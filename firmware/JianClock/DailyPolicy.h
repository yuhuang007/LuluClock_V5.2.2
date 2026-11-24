#pragma once
#include <cstdint>
#include <cstring>
#include <cstdio>

namespace daily {
struct Config {
  uint32_t version=2;
  uint16_t every=1,from=0,to=0,nightFrom=22*60,nightTo=8*60;
  uint8_t night=1,brightness=10,ambient=0,darkLow=0;
  bool valid() const {
    return version==2&&every>=1&&every<=60&&from<1440&&to<1440&&nightFrom<1440&&nightTo<1440&&
      nightFrom!=nightTo&&night<=1&&brightness>=5&&brightness<=100&&ambient<=1&&darkLow<=1;
  }
};
// Correct the 4.1.18 default on existing installations too. Once upgraded,
// subsequent intentional polarity edits are retained normally.
inline bool migrate(Config &c){
  if(c.version!=1)return false;
  Config next=c;next.version=2;
  if(!next.valid())return false;
  next.darkLow=0;c=next;return true;
}
inline bool inside(unsigned minute,unsigned from,unsigned to) {
  return from==to|| (from<to ? minute>=from&&minute<to : minute>=from||minute<to);
}
inline bool night(const Config &c,unsigned minute) { return c.night&&inside(minute,c.nightFrom,c.nightTo); }
inline bool due(const Config &c,unsigned minute) { return inside(minute,c.from,c.to)&&!night(c,minute)&&minute%c.every==0; }
inline unsigned wait(const Config &c,unsigned minute,unsigned second,bool currentUsed) {
  for(unsigned i=0;i<=1440;++i)
    if((i||!currentUsed)&&due(c,(minute+i)%1440))return i*60+(i?0:second)-second;
  return 0xffffffffU;
}
class Light {
 public:
  bool stable=false,candidate=false,initialized=false;
  uint8_t seen=0;uint32_t changed=0,stableAt=0,transitions=0;
  void update(bool high,uint32_t now) {
    if(!initialized){stable=candidate=high;changed=stableAt=now;seen=high?2:1;initialized=true;return;}
    if(high!=candidate){candidate=high;changed=now;}
    if(candidate!=stable&&now-changed>=500){stable=candidate;stableAt=now;seen|=stable?2:1;++transitions;}
  }
  bool verified() const { return seen==3&&transitions>=2; }
  bool dark(bool low) const { return low?!stable:stable; }
};

// Request IDs are scoped to a BLE connection. Replaying a recent command
// returns its original answer instead of executing a motor/light action twice.
class Requests {
  struct Entry { long id=0;char request[640]{},reply[640]{}; } entries[8];
  unsigned cursor=0;Entry *active=nullptr;
 public:
  enum Result { Fresh,Replay,Conflict };
  void clear(){for(auto &e:entries)e.id=0;active=nullptr;cursor=0;}
  Result begin(long id,const char *request,const char *&reply) {
    active=nullptr;
    for(auto &e:entries)if(e.id==id){reply=e.reply;return !strcmp(e.request,request)?Replay:Conflict;}
    active=&entries[cursor++%8];active->id=id;active->reply[0]=0;
    snprintf(active->request,sizeof(active->request),"%s",request);return Fresh;
  }
  void record(const char *reply){
    if(!active)return;char prefix[24];snprintf(prefix,sizeof(prefix),"%ld|",active->id);
    if(!strncmp(reply,prefix,strlen(prefix)))snprintf(active->reply,sizeof(active->reply),"%s",reply);
  }
  void end(){active=nullptr;}
};
enum class Stage : uint8_t { Idle,Preparing,Drawing,Homing,Complete,Stopped,Error,Uploading,Waiting };
inline const char *name(Stage s){
  switch(s){case Stage::Preparing:return "preparing";case Stage::Drawing:return "drawing";
    case Stage::Homing:return "homing";case Stage::Complete:return "complete";case Stage::Stopped:return "stopped";
    case Stage::Error:return "error";case Stage::Uploading:return "uploading";case Stage::Waiting:return "waiting";
    default:return "idle";}
}
}
