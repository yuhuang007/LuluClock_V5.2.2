#pragma once
#include <cstdint>
#include <cstring>
namespace clockwork {
// One NVS blob makes SSID/password replacement atomic. Empty SSID means forgotten.
struct NetworkConfig {
  uint32_t version=1;
  char ssid[33]={}, password[64]={};
  bool valid() const {
    if(version!=1 || !memchr(ssid,0,sizeof(ssid)) || !memchr(password,0,sizeof(password)))return false;
    size_t n=strlen(password);
    return strlen(ssid)<=32 && (!n || (ssid[0] && n>=8 && n<=63));
  }
};
inline int hexDigit(char c) {
  return c>='0'&&c<='9'?c-'0':c>='a'&&c<='f'?c-'a'+10:c>='A'&&c<='F'?c-'A'+10:-1;
}
inline bool decodeHex(const char *text,size_t length,char *out,size_t capacity) {
  if(length%2 || length/2>=capacity)return false;
  for(size_t i=0;i<length;i+=2){int a=hexDigit(text[i]),b=hexDigit(text[i+1]);if(a<0||b<0||!(a||b))return false;out[i/2]=char(a*16+b);}
  out[length/2]=0;return true;
}
inline bool parseNetwork(const char *args,NetworkConfig &out) {
  const char *comma=strchr(args,',');if(!comma||strchr(comma+1,','))return false;
  NetworkConfig candidate;
  if(!decodeHex(args,comma-args,candidate.ssid,sizeof(candidate.ssid)) || !candidate.ssid[0] ||
     !decodeHex(comma+1,strlen(comma+1),candidate.password,sizeof(candidate.password)) || !candidate.valid())return false;
  out=candidate;return true;
}
}
