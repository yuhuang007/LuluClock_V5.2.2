#pragma once
#include <cstdlib>
#include <cerrno>
#include <cstdint>
#include <cstring>
namespace protocol {
inline bool number(const char *text,long low,long high,long &value) {
  if (!text || !*text) return false;
  for (const char *p=text;*p;++p) if ((*p<'0'||*p>'9') && !(p==text && *p=='-')) return false;
  char *end=nullptr; errno=0; long parsed=strtol(text,&end,10);
  if (errno || !end || *end || parsed<low || parsed>high) return false;
  value=parsed; return true;
}
struct Command { long id=0; char *name=nullptr; char *args=nullptr; };
inline bool parse(char *line,Command &out) {
  char *first=strchr(line,'|'); if (!first) return false;
  *first++=0;
  if (!number(line,1,999999,out.id)) return false;
  char *second=strchr(first,'|');
  if (second) { *second++=0; out.args=second; } else out.args=first+strlen(first);
  if (!*first || strlen(first)>16) return false;
  for (char *p=first;*p;++p) if (*p<'A'||*p>'Z') return false;
  out.name=first; return true;
}
inline bool integers(char *text,long *values,size_t count,long low,long high) {
  if (!text) return false;
  for (size_t i=0;i<count;++i) {
    char *comma=strchr(text,',');
    if ((i<count-1 && !comma) || (i==count-1 && comma)) return false;
    if (comma) *comma=0;
    if (!number(text,low,high,values[i])) return false;
    if (comma) text=comma+1;
  }
  return true;
}
}
