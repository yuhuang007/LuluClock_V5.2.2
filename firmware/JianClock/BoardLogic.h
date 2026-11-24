#pragma once
#include <cstdint>
#include <cmath>

namespace boardlogic {
// One event per debounced press, including held-at-boot suppression and rollover.
class Press {
 public:
  void begin(uint32_t now, bool down) { raw=stable=suppressed=down; changed=now; }
  bool poll(uint32_t now, bool down) {
    if (raw!=down) { raw=down; changed=now; }
    if (now-changed<15 || raw==stable) return false;
    stable=raw;
    if (!stable) { suppressed=false; return false; }
    return !suppressed;
  }
 private:
  bool raw=false,stable=false,suppressed=false;
  uint32_t changed=0;
};

struct Sample {
  float temperature=0, humidity=0;
  uint32_t sampledAt=0;
  bool ever=false, lastOk=false;
  const char *status(uint32_t now) const {
    if (!ever) return lastOk?"waiting":"missing";
    if (!lastOk) return "error";
    return now-sampledAt>10000 ? "stale" : "valid";
  }
};

// Decode a complete DHT11 frame only; failures never overwrite the last sample.
inline bool decodeDht(const uint8_t data[5], float &temperature, float &humidity) {
  if (static_cast<uint8_t>(data[0]+data[1]+data[2]+data[3])!=data[4]) return false;
  float h=data[0]+data[1]*0.1f;
  float t=data[2]+(data[3]&0x7f)*0.1f;
  if (data[3]&0x80) t=-t;
  if (data[1]>9 || (data[3]&0x7f)>9 || h>100 || t<0 || t>80) return false;
  temperature=t; humidity=h; return true;
}
}
