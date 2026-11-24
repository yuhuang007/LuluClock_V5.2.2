// Included after Extended.inc: old C3 commands/UUIDs stay unchanged.
void sendEnvironment(long id) {
  const auto &s=board::sample();uint32_t now=millis();
  String line=String(id)+"|ENV|sensor="+s.status(now);
  // Invalid readings are explicit; absent values are never reported as zero.
  bool valid=!strcmp(s.status(now),"valid");
  line+=",temp="+String(valid?String(s.temperature,1):String("na"));
  line+=",humidity="+String(valid?String(s.humidity,1):String("na"));
  line+=",age="+String(s.ever?String((now-s.sampledAt)/1000):String("na"));
  line+=",lightverified="+String(board::lightVerified())+",lightstable="+String(board::lightStable());
  line+=",do="+String(board::lightRaw())+",oled="+String(board::oledOk());
  line+=",page="+String(board::page())+",strip="+String(board::stripOn());
  line+=",stripok="+String(config::STRIP_OUTPUT_ENABLED);
  line+=",drawok="+String(config::DRAW_LED_DRIVE_ENABLED)+",rotation="+String(config::OLED_ROTATE_180?180:0)+",dopullup="+String(config::LIGHT_DO_PULLUP);
  sendReply(line);
}
bool handleBoard(long id,const char *name,char *args) {
  if(!strcmp(name,"MOTIONINFO")){
    Pulses home{};const bool valid=solve(HOME_X,HOME_Y,calibration,home);
    String line=String(id)+"|MOTIONINFO|id="+blelink::deviceCode()+",hx="+String(HOME_X,1)+",hy="+String(HOME_Y,1);
    line+=",valid="+String(valid)+",left="+String(home.left)+",right="+String(home.right);
    line+=",lpin="+String(config::LEFT_SERVO)+",rpin="+String(config::RIGHT_SERVO);
    line+=",lfreq="+String(servoReady?ledcReadFreq(config::LEFT_SERVO):0)+",rfreq="+String(servoReady?ledcReadFreq(config::RIGHT_SERVO):0);
    line+=",lduty="+String(servoReady?ledcRead(config::LEFT_SERVO):0)+",rduty="+String(servoReady?ledcRead(config::RIGHT_SERVO):0);
    line+=",mode="+String(calibrationMode?"install":"clock")+",pose="+String(calibrationMode?(calibrationHalf?"A":"B"):"none")+",busy="+String(motion.busy());
    line+=",slz="+String(calibration.leftZero)+",sls="+String(calibration.leftScale)+",srz="+String(calibration.rightZero)+",srs="+String(calibration.rightScale);
    sendReply(line);return true;
  }
  if(!strcmp(name,"DISPLAY")||!strcmp(name,"DISPLAYSET")){
    if(!strcmp(name,"DISPLAYSET")){
      long values[3];
      if(!protocol::integers(args,values,3,0,3600)||values[0]>1||values[2]<5||values[2]>100||
         (values[1]>0&&values[1]<15)){sendReply(String(id)+"|ERR|BAD_VALUE");return true;}
      if(!board::displaySettings(values[0],values[1],values[2])){sendReply(String(id)+"|ERR|SAVE_FAILED");return true;}
    }
    bool animation;unsigned sleep,brightness;board::getDisplaySettings(animation,sleep,brightness);
    sendReply(String(id)+"|DISPLAY|animation="+String(animation)+",sleep="+String(sleep)+",brightness="+String(brightness));return true;
  }
  if(!strcmp(name,"CAPS")){
    sendReply(String(id)+"|CAPS|board=s3-n16r8,product=2.0,protocol=4,ota=1,rgb=1,rgbpin=48,wifiscan=1,oled=ssd1306,dht=dht11,light=do,keys=3,env=1,display=1,daily=1,jobstate=1,ambient=1,strip="+String(config::STRIP_OUTPUT_ENABLED));return true;
  }
  if(!strcmp(name,"ENV")){sendEnvironment(id);return true;}
  if(!strcmp(name,"PAGE")||!strcmp(name,"STRIP")){
    long value=0;
    if(!protocol::number(args,0,!strcmp(name,"PAGE")?2:1,value)){sendReply(String(id)+"|ERR|BAD_VALUE");return true;}
    if(!strcmp(name,"PAGE"))board::setPage(value);
    else if(!board::setStrip(value)){sendReply(String(id)+(dailyNight()?"|ERR|NIGHT_QUIET":"|ERR|STRIP_UNVERIFIED"));return true;}
    sendReply(String(id)+"|OK|done");return true;
  }
  return false;
}
void boardTick() {
  board::View view;fillDailyView(view);
  view.install=calibrationMode;view.poseB=!calibrationHalf;view.fault=fault;
  view.clock=clockReady;view.linked=blelink::connected();view.wifi=WiFi.status()==WL_CONNECTED;
  view.moving=motion.busy();view.dry=dryRun;view.automatic=autoDraw;
  view.progress=motion.progress();view.timer=countdownActive?remaining(millis(),countdownEnd):0;
  view.ota=ota::active();view.otaProgress=ota::progress();view.otaStage=ota::displayStage();
  view.timerActive=countdownActive;view.timerPhase=pomoPhase;
  view.networkBusy=network!=Network::Off||wifiscan::busy();view.syncing=network==Network::Syncing;
  snprintf(view.error,sizeof(view.error),"%s",errorMessage.c_str());
  snprintf(view.task,sizeof(view.task),"%s",taskName.c_str());
  // Calendar conversion/formatting is unnecessary at every servo loop. Key by
  // wall-clock second so NTP/phone corrections in either direction invalidate it.
  static time_t formattedAt=0;
  static char cachedTime[sizeof(view.time)]{},cachedDate[sizeof(view.date)]{};
  const time_t now=time(nullptr);
  if(clockReady&&now>=1700000000){
    if(now!=formattedAt){
      tm t{};localtime_r(&now,&t);
      strftime(cachedTime,sizeof(cachedTime),"%H:%M",&t);
      strftime(cachedDate,sizeof(cachedDate),"%Y-%m-%d",&t);formattedAt=now;
    }
    memcpy(view.time,cachedTime,sizeof(view.time));memcpy(view.date,cachedDate,sizeof(view.date));
  }
  board::tick(view,!motion.busy()&&!uploadExpected,!uploadExpected&&motion.peripheralSlot());
}
