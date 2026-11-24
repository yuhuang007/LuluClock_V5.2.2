// S3 extension; leave the original C3 provisioning/NTP state machine unchanged.
String beforeScanWifi;
bool scanWasBusy=false;
void cancelWifiScan(){
  if(wifiscan::busy()){wifiscan::cancel();wifiState=beforeScanWifi;sendWifi();}
  scanWasBusy=false;
}
void wifiScanTick(){
  wifiscan::tick();
  if(scanWasBusy&&!wifiscan::busy()){wifiState=beforeScanWifi;sendWifi();scanWasBusy=false;}
}
bool handleWifiScan(long id,const char*name,char*args){
  if(!strcmp(name,"WIFILIST")){
    long index=0;if(*args&&!protocol::number(args,0,15,index)){sendReply(String(id)+"|ERR|BAD_VALUE");return true;}
    sendReply(wifiscan::info(id,index));return true;
  }
  if(!strcmp(name,"WIFISCANCEL")){cancelWifiScan();sendReply(wifiscan::info(id));return true;}
  if(strcmp(name,"WIFISCAN"))return false;
  if(ota::active()||calibrationMode||motion.busy()||countdownActive||uploadExpected){sendReply(String(id)+"|ERR|BUSY");return true;}
  if(!wifiscan::busy()){
    beforeScanWifi=network==Network::Off?wifiState:String("saved");stopNetwork();
    wifiscan::start();scanWasBusy=wifiscan::busy();
    wifiState=scanWasBusy?String("scanning"):beforeScanWifi;sendWifi();
  }
  sendReply(wifiscan::info(id));return true;
}
