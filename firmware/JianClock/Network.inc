// Included in Firmware.cpp; nonblocking BLE provisioned Wi-Fi and NTP.
String hexText(const String &value) {
  static const char digits[]="0123456789abcdef";String out;out.reserve(value.length()*2);
  for(size_t i=0;i<value.length();++i){uint8_t c=value[i];out+=digits[c>>4];out+=digits[c&15];}return out;
}
void sendWifi(long id=0) {
  sendReply(String(id)+"|WIFI|status="+wifiState+",ssid="+hexText(storedSsid)+",ip="+(WiFi.status()==WL_CONNECTED?WiFi.localIP().toString():String("")));
}
void stopNetwork() { WiFi.disconnect(true,false);WiFi.mode(WIFI_OFF);network=Network::Off; }
bool saveNetwork(const NetworkConfig &next) {
  if(!next.valid()||!prefs.begin("jc3",false))return false;
  bool saved=prefs.putBytes("network",&next,sizeof(next))==sizeof(next);prefs.end();
  if(saved){storedSsid=next.ssid;storedPass=next.password;}return saved;
}
void connectNetwork() {
  stopNetwork();lastSyncAttempt=millis();timeWasSynced=false;
  if(!storedSsid.length()){wifiState="unconfigured";sendWifi();return;}
  wifiState="connecting";network=Network::Connecting;networkAt=millis();
  WiFi.mode(WIFI_STA);WiFi.begin(storedSsid.c_str(),storedPass.c_str());sendWifi();
}
void networkTick() {
  uint32_t now=millis();
  if(network==Network::Connecting){
    if(WiFi.status()==WL_CONNECTED){
      timeWasSynced=false;
      configTime(config::UTC_OFFSET,0,config::NTP_1,config::NTP_2,config::NTP_3);
      wifiState="syncing";network=Network::Syncing;networkAt=now;sendWifi();
    }else if(now-networkAt>config::CONNECT_TIMEOUT_MS){
      stopNetwork();wifiState="connect_failed";board::notify(oledmotion::Notice::NetworkError);sendWifi();
    }
  }else if(network==Network::Syncing){
    if(timeWasSynced.exchange(false)){
      clockReady=true;lastMinute=-1;checkedPlanMinute=time(nullptr)/60;
      stopNetwork();wifiState="synced";board::notify(oledmotion::Notice::Synced);sendWifi();
    }else if(now-networkAt>config::SYNC_TIMEOUT_MS){
      stopNetwork();wifiState="sync_failed";board::notify(oledmotion::Notice::NetworkError);sendWifi();
    }
  }else if(storedSsid.length()&&!calibrationMode&&!motion.busy()&&now-lastSyncAttempt>config::RESYNC_INTERVAL_MS)connectNetwork();
}

