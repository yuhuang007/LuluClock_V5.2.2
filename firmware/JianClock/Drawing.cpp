#include "Drawing.h"
#include "Strokes.h"
#include <algorithm>
namespace clockwork {
void glyph(Path &path, bool digit, unsigned id, float x, float y, float width, float height) {
  const Glyph &g = digit ? DIGITS[id < 12 ? id : 10] : LETTERS[id < 20 ? id : 0];
  for (unsigned i=0; i<g.count; ++i) {
    const Stroke &s = g.points[i];
    path.push_back({x+width*s.x, y+height*s.y, s.dwell, s.lit});
  }
}
static void home(Path &p) { p.push_back({HOME_X, HOME_Y, 0, false}); }
Path timePath(int hour, int minute) {
  Path p; p.reserve(1100);
  glyph(p,true,hour/10,4,8.5,10.5,27.8);
  glyph(p,true,hour%10,21.5,8.5,10.5,27.8);
  glyph(p,true,11,34,8.5,10.5,27.8);
  glyph(p,true,minute/10,46,8.5,10.5,27.8);
  glyph(p,true,minute%10,63,8.5,10.5,27.8);
  home(p); return p;
}
Path datePath(int month, int day, int weekday) {
  // Original layout: month/day at the left, SUN..SAT at the right.
  static const uint8_t week[7][3] = {{8,10,12},{5,6,12},{9,10,2},{11,2,13},{9,4,10},{3,7,14},{8,1,9}};
  Path p; p.reserve(1500);
  glyph(p,true,month/10,5.5,25.5,9,13); glyph(p,true,month%10,20,25.5,9,13);
  glyph(p,true,day/10,5.5,6.7,9.2,13); glyph(p,true,day%10,20,6.7,9.2,13);
  for (unsigned i=0;i<3;++i) glyph(p,false,week[weekday%7][i],37.5+i*13.5,8,8,26);
  home(p); return p;
}
Path wifiPath() {
  Path p; p.reserve(60);
  glyph(p,false,11,10,10,10,25); glyph(p,false,14,30,10,8,25);
  glyph(p,false,3,45,10,10,25); glyph(p,false,14,60,10,8,25);
  home(p); return p;
}
Path patternPath(unsigned pattern) {
  Path p;
  auto point=[&](float x,float y,bool lit) { p.push_back({x,y,0,lit}); };
  if (pattern==0) { // Rectangle
    point(12,12,false); point(66,12,true); point(66,33,true); point(12,33,true); point(12,12,true);
  } else if (pattern==1) { // Cross
    point(15,22,false); point(63,22,true); point(39,11,false); point(39,34,true);
  } else if (pattern==2) { // Ellipse
    for (int i=0;i<=80;++i) { double t=i*2*K_PI/80; point(39+24*cos(t),22+10*sin(t),i!=0); }
  } else if (pattern==3) { // Grid
    for (int x=15;x<=63;x+=12) { point(x,12,false); point(x,32,true); }
    for (int y=12;y<=32;y+=5) { point(15,y,false); point(63,y,true); }
  } else { // Heart, transformed into the validated drawing rectangle.
    for (int i=0;i<=100;++i) {
      double t=i*2*K_PI/100;
      point(39+1.5*16*pow(sin(t),3),23+0.65*(13*cos(t)-5*cos(2*t)-2*cos(3*t)-cos(4*t)),i!=0);
    }
  }
  home(p); return p;
}
bool validatePath(const Path &path, double sx, double sy, const Calibration &cal, bool (*proceed)()) {
  if (path.size() > 4096) return false;
  unsigned checked=0;
  if (proceed && !proceed()) return false;
  Pulses pulses;
  for (const Point &p : path) {
    if (!std::isfinite(p.x) || !std::isfinite(p.y)) return false;
    double distance = std::hypot(p.x-sx,p.y-sy);
    if (distance > 200) return false;
    int steps = std::max(1, static_cast<int>(std::ceil(distance*5)));
    for (int i=1;i<=steps;++i) {
      if (++checked%128==0 && proceed && !proceed()) return false;
      if (!solve(sx+(p.x-sx)*i/steps, sy+(p.y-sy)*i/steps, cal, pulses)) return false;
    }
    sx=p.x; sy=p.y;
  }
  return true;
}
}
