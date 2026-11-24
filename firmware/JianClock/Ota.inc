bool handleOta(long id,const char *name,char *args){
  if(!strcmp(name,"OTAINFO")){sendReply(ota::info(id,true));return true;}
  if(!strcmp(name,"OTACANCEL")){ota::cancel();sendReply(ota::info(id));return true;}
  if(strcmp(name,"OTAOPEN"))return false;
  if(ota::active()){sendReply(String(id)+"|ERR|OTA_BUSY");return true;}
  char *sha=strchr(args,',');long bytes=0;
  if(!sha){sendReply(String(id)+"|ERR|BAD_VALUE");return true;}*sha++=0;
  if(!protocol::number(args,288,3*1024*1024,bytes)||!otapolicy::hex(sha,64)){sendReply(String(id)+"|ERR|BAD_VALUE");return true;}
  if(!storedSsid.length()){sendReply(String(id)+"|ERR|OTA_WIFI_REQUIRED");return true;}
  // Do not start a second transaction while an HTTP worker is unwinding.
  stopRemote();calibrationMode=false;restartAt=0;restartOnRelease=false;
  stopNetwork();wifiState="ota";
  const char *error=ota::open(bytes,sha,storedSsid.c_str(),storedPass.c_str());
  if(error)sendReply(String(id)+"|ERR|"+error);else sendReply(ota::info(id));
  return true;
}
