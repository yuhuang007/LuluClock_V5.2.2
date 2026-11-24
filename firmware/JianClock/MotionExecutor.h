#pragma once
#include "Drawing.h"
#include <algorithm>
#include <cmath>
#include <vector>

namespace clockwork {
// Open-loop servo timing. Coordinates are unchanged; no position feedback is
// claimed. PWM targets are spaced by a complete 50 Hz frame, with dark settling
// between strokes. Forward/backward speed limits preserve sharp vertices.
class MotionExecutor {
 public:
  static constexpr unsigned FRAME_MS=20, ARRIVAL_MS=60, HOME_ARRIVAL_MS=100, BLANK_MS=20;
  static constexpr double MAX_LIT_SPEED=40.0, MAX_DARK_SPEED=50.0;
  struct Frame { double x=0,y=0; bool position=false,lit=false; unsigned power=0; };
  bool busy() const {return points&&segment<points->size();}
  size_t index() const {return segment;}
  uint32_t nextAt() const {return deadline;}
  uint64_t duration() const {return durationMs;}
  uint64_t elapsed() const {return std::min(durationMs,completedMs);}
  void cancel(){points=nullptr;junction.clear();segment=0;durationMs=completedMs=0;}
  void begin(const Path &path,double x,double y,unsigned stepMs,uint32_t now){
    points=&path;originX=x;originY=y;requestedStepMs=stepMs;segment=frame=0;
    phase=Phase::Move;deadline=now;durationMs=completedMs=0;
    if(path.empty())return;
    junction.assign(path.size()+1,0);
    for(size_t i=1;i<path.size();++i){
      const auto a=geometry(i-1),b=geometry(i);
      if(!path[i-1].lit||!path[i].lit||path[i-1].dwell||a.distance<1e-7||b.distance<1e-7)continue;
      const double cosine=std::max(-1.0,std::min(1.0,(a.dx*b.dx+a.dy*b.dy)/(a.distance*b.distance)));
      const double half=std::sqrt((1+cosine)/2);
      // Junction deviation bounds speed; it never changes/rounds a vertex.
      const double corner=half>.99999?std::min(a.limit,b.limit):std::sqrt(ACCEL*.06*half/std::max(1e-9,1-half));
      junction[i]=std::min(std::min(a.limit,b.limit),corner);
    }
    for(size_t i=0;i<path.size();++i)junction[i+1]=std::min(double(junction[i+1]),std::sqrt(junction[i]*junction[i]+2*ACCEL*geometry(i).distance));
    for(size_t i=path.size();i-->0;)junction[i]=std::min(double(junction[i]),std::sqrt(junction[i+1]*junction[i+1]+2*ACCEL*geometry(i).distance));
    for(size_t i=0;i<path.size();++i)durationMs+=profile(i).duration;
    current=profile(0);
  }

  // At most one command per call. Late loops extend the timeline; they never
  // issue a burst of skipped PWM targets to catch up.
  bool poll(uint32_t now,Frame &out){
    out=Frame{};
    if(!busy()||static_cast<int32_t>(now-deadline)<0)return false;
    if(phase==Phase::LitEnd){
      out.lit=false;phase=Phase::BlankEnd;deadline=now+BLANK_MS;
      completedMs+=FRAME_MS+(*points)[segment].dwell;return true;
    }
    if(phase!=Phase::Move){
      if(phase==Phase::BlankEnd)completedMs+=BLANK_MS;
      else completedMs+=current.after+(*points)[segment].dwell;
      ++segment;frame=0;phase=Phase::Move;
      if(!busy()){completedMs=durationMs;return true;}
      current=profile(segment);
    }
    const auto &s=current;const auto &p=(*points)[segment];
    const double t=s.seconds*++frame/s.frames;
    double distance;
    if(t<s.accTime)distance=s.entry*t+ACCEL*t*t/2;
    else if(t<s.accTime+s.cruiseTime)distance=s.accDistance+s.peak*(t-s.accTime);
    else {const double remaining=std::max(0.0,s.seconds-t);distance=s.distance-s.exit*remaining-ACCEL*remaining*remaining/2;}
    const double ratio=frame==s.frames||s.distance<1e-7?1:std::max(0.0,std::min(1.0,distance/s.distance));
    // Drawing uses full commanded drive, including starts/corners/ends.
    // Pen-up movement remains fully dark. No velocity-based dimming.
    out={s.x+s.dx*ratio,s.y+s.dy*ratio,true,p.lit,p.lit?255U:0U};
    if(frame<s.frames){deadline=now+FRAME_MS;completedMs+=FRAME_MS;}
    else if(!p.lit){phase=Phase::DarkArrival;deadline=now+s.after+p.dwell;}
    else if(segment+1<points->size()&&(*points)[segment+1].lit){phase=Phase::CornerHold;deadline=now+FRAME_MS+p.dwell;}
    else {phase=Phase::LitEnd;deadline=now+FRAME_MS+p.dwell;}
    return true;
  }
 private:
  static constexpr double ACCEL=280.0;
  struct Segment {
    double x,y,dx,dy,distance,limit,entry,exit,peak,accTime,decTime,cruiseTime,accDistance,seconds;
    unsigned frames,after;uint64_t duration;
  };
  enum class Phase {Move,DarkArrival,LitEnd,BlankEnd,CornerHold};
  const Path *points=nullptr;
  Segment current{};
  std::vector<float> junction;
  double originX=0,originY=0;unsigned requestedStepMs=4;
  Segment geometry(size_t i) const {
    const auto &p=(*points)[i];Segment s{};
    s.x=i?(*points)[i-1].x:originX;s.y=i?(*points)[i-1].y:originY;
    s.dx=p.x-s.x;s.dy=p.y-s.y;s.distance=std::hypot(s.dx,s.dy);
    s.limit=p.lit?std::min(MAX_LIT_SPEED,200.0/std::max(2U,requestedStepMs)):MAX_DARK_SPEED;
    return s;
  }
  Segment profile(size_t i) const {
    auto s=geometry(i);const auto &p=(*points)[i];
    s.entry=junction[i];s.exit=junction[i+1];
    s.peak=std::min(s.limit,std::sqrt(ACCEL*s.distance+(s.entry*s.entry+s.exit*s.exit)/2));
    s.accTime=std::max(0.0,(s.peak-s.entry)/ACCEL);
    s.decTime=std::max(0.0,(s.peak-s.exit)/ACCEL);
    s.accDistance=(s.entry+s.peak)*s.accTime/2;
    const double decDistance=(s.exit+s.peak)*s.decTime/2;
    s.cruiseTime=s.peak>1e-9?std::max(0.0,(s.distance-s.accDistance-decDistance)/s.peak):0;
    s.seconds=s.accTime+s.cruiseTime+s.decTime;
    s.frames=std::max(1U,static_cast<unsigned>(std::ceil(s.seconds*1000/FRAME_MS)));
    const bool finalHome=i+1==points->size()&&!p.lit&&p.x==HOME_X&&p.y==HOME_Y;
    s.after=!p.lit?(finalHome?HOME_ARRIVAL_MS:ARRIVAL_MS):(i+1<points->size()&&(*points)[i+1].lit?FRAME_MS:FRAME_MS+BLANK_MS);
    s.duration=uint64_t(s.frames-1)*FRAME_MS+s.after+p.dwell;
    return s;
  }
  size_t segment=0;unsigned frame=0;Phase phase=Phase::Move;
  uint32_t deadline=0;uint64_t durationMs=0,completedMs=0;
};
}
