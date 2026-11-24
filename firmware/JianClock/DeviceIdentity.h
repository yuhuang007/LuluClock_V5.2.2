#pragma once
#include <cstdint>
#include <cstdio>

namespace deviceidentity {
struct Identity {
  char code[16]{};
  char name[30]{};
};
inline bool make(const uint8_t mac[6],Identity &out) {
  bool zero=true,ones=true;
  for(unsigned i=0;i<6;++i){zero&=mac[i]==0;ones&=mac[i]==255;}
  if(zero||ones){out=Identity{};return false;}
  char hex[13];
  snprintf(hex,sizeof(hex),"%02X%02X%02X%02X%02X%02X",mac[0],mac[1],mac[2],mac[3],mac[4],mac[5]);
  snprintf(out.code,sizeof(out.code),"S3-%s",hex);
  // 12 UTF-8 brand bytes + space + 12 hex bytes + 2 AD bytes = 27/31.
  // Keep the complete factory ID in the scan name, never just a short suffix.
  snprintf(out.name,sizeof(out.name),"小噜时钟 %s",hex);
  return true;
}
}
