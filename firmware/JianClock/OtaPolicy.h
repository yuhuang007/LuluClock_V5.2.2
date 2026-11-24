#pragma once
#include <cstdint>
#include <cstddef>
#include <cstring>
namespace otapolicy {
constexpr size_t MIN_IMAGE=288,MAX_IMAGE=3*1024*1024;
inline bool hex(const char *s,size_t n){if(!s||strlen(s)!=n)return false;for(size_t i=0;i<n;++i)if(!((s[i]>='0'&&s[i]<='9')||(s[i]>='a'&&s[i]<='f')))return false;return true;}
// Arduino S3 app image: 24-byte image header + 8-byte segment header + app desc.
// This rejects merged images, C3 images and another project's application.
inline bool imageHeader(const uint8_t *data,size_t size){
  return size>=MIN_IMAGE&&data[0]==0xe9&&data[12]==9&&data[13]==0&&
    data[32]==0x32&&data[33]==0x54&&data[34]==0xcd&&data[35]==0xab&&
    !memcmp(data+80,"JianClock\0",10);
}
inline bool length(size_t size,size_t partition){return size>=MIN_IMAGE&&size<=MAX_IMAGE&&size<=partition;}
inline bool expired(uint32_t now,uint32_t started){return now-started>=180000;}
}
