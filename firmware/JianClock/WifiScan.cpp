#include "WifiScan.h"
#include <WiFi.h>
#include <cstring>
#include <algorithm>

namespace wifiscan {
namespace {
enum Phase { Idle,Scanning,Ready,Failed,Cancelled };
Phase phase=Idle;uint32_t started=0;
struct Row {char ssid[33]{};int rssi=-127;uint8_t auth=0;};
constexpr unsigned LIMIT=16;
Row rows[LIMIT];unsigned count=0;
bool supported(uint8_t a){return a==WIFI_AUTH_OPEN||a==WIFI_AUTH_WPA_PSK||a==WIFI_AUTH_WPA2_PSK||a==WIFI_AUTH_WPA_WPA2_PSK||a==WIFI_AUTH_WPA3_PSK||a==WIFI_AUTH_WPA2_WPA3_PSK;}
void radioOff(){WiFi.scanDelete();WiFi.disconnect(true,false);WiFi.mode(WIFI_OFF);}
void collect(int n){
  for(int i=0;i<n;++i){
    String ssid=WiFi.SSID(i);if(!ssid.length()||ssid.length()>32)continue;
    Row next;ssid.toCharArray(next.ssid,sizeof(next.ssid));next.rssi=WiFi.RSSI(i);next.auth=WiFi.encryptionType(i);
    unsigned at=0;for(;at<count;++at)if(!strcmp(rows[at].ssid,next.ssid)&&rows[at].auth==next.auth)break;
    if(at<count){if(next.rssi>rows[at].rssi)rows[at]=next;}
    else if(count<LIMIT)rows[count++]=next;
    else if(next.rssi>rows[count-1].rssi)rows[count-1]=next;
    std::sort(rows,rows+count,[](const Row&a,const Row&b){return a.rssi>b.rssi;});
  }
  radioOff();phase=Ready;
}
}
bool busy(){return phase==Scanning;}
bool start(){
  if(busy())return false;
  count=0;started=millis();phase=Scanning;
  WiFi.mode(WIFI_STA);WiFi.scanDelete();
  int n=WiFi.scanNetworks(true,false,false,120);
  if(n>=0)collect(n);
  else if(n!=WIFI_SCAN_RUNNING){radioOff();phase=Failed;}
  return phase!=Failed;
}
void tick(){
  if(!busy())return;
  int n=WiFi.scanComplete();
  if(n>=0)collect(n);
  else if(n!=WIFI_SCAN_RUNNING||millis()-started>=15000){radioOff();phase=Failed;}
}
void cancel(){if(!busy())return;radioOff();count=0;phase=Cancelled;}
String info(long id,unsigned index){
  const char* state=phase==Scanning?"scanning":phase==Ready?"ready":phase==Failed?"failed":phase==Cancelled?"cancelled":"idle";
  String out=String(id)+"|SCAN|state="+state+",count="+String(count)+",index="+String(index);
  if(phase==Ready&&index<count){
    const Row&r=rows[index];char hex[65]{};const char* digits="0123456789abcdef";
    for(unsigned i=0;r.ssid[i];++i){uint8_t b=r.ssid[i];hex[2*i]=digits[b>>4];hex[2*i+1]=digits[b&15];}
    out+=",ssid="+String(hex)+",rssi="+String(r.rssi)+",auth="+String(r.auth==WIFI_AUTH_OPEN?"open":supported(r.auth)?"psk":"unsupported");
  }
  return out;
}
}
