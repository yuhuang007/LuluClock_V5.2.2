// Extended v3 controller. Included inside Firmware.cpp's anonymous namespace.
bool startTimer(bool pomodoro,unsigned seconds) {
  if(!manualReady()||fault||!leaveInstallation())return false;
  pauseForRemote();countdownActive=true;
  pomoPhase=pomodoro?1:0;pomoCycle=pomodoro?1:0;
  countdownEnd=millis()+(pomodoro?settings.work*60UL:seconds?seconds:settings.timerMinutes*60UL)*1000UL;
  countdownDrawAt=0;markTask(pomodoro?"focus":"timer");jobActive=false;return true;
}
bool executeAction(unsigned action,bool fromPhone) {
  if(action>Reminder||calibrationMode)return false;
  if(action==Nothing)return true;
  if(action==Reminder)return soundAlert();
  if(action==Quiet||action==Dry){
    bool next=action==Quiet?!quiet:!dryRun;
    if(!prefs.begin("wifi_cfg",false))return false;
    bool saved=prefs.putBool(action==Quiet?"quiet":"dry",next)==1;prefs.end();if(!saved)return false;
    if(action==Quiet){quiet=next;if(quiet)stopBeep();}else{dryRun=next;if(dryRun)light(false);}return true;
  }
  if(action==Auto){
    if(!manualReady()||fault||!clockReady)return false;
    Settings next=settings;next.autoEnabled=!autoDraw;if(!saveSettings(next))return false;
    autoDraw=next.autoEnabled;remoteJob=false;if(autoDraw){lastMinute=-1;plansArmed=true;}return true;
  }
  if(action==Home){if(motion.busy()||countdownActive||uploadExpected)return false;fault=false;errorMessage="";pauseForRemote();remoteJob=fromPhone;goHome();return !fault;}
  if(!manualReady()||fault)return false;
  if(action==Timer||action==Pomodoro){bool started=startTimer(action==Pomodoro);if(started)remoteJob=fromPhone;return started;}
  if((action==Time||action==Date)&&!clockReady)return false;
  if(action==Favorite&&favoritePath.empty())return false;
  pauseForRemote();remoteJob=fromPhone;
  if(action==Time)drawTime();else if(action==Date)drawDate();
  else {markTask(action==Favorite?"favorite":"pattern");if(!motion.start(action==Favorite?favoritePath:patternPath(action-Box))){jobActive=false;return false;}}
  return !fault;
}
void sendConfig(long id) {
  String line=String(id)+"|CONFIG|repeat="+String(settings.repeats)+",step="+String(settings.speed);
  for(unsigned i=0;i<5;++i)line+=",k"+String(i)+"="+String(settings.keys[i]);
  line+=",preset="+String(settings.timerMinutes)+",work="+String(settings.work)+",rest="+String(settings.rest)+",rounds="+String(settings.rounds);
  line+=",chime="+String(settings.chime)+",from="+String(settings.chimeStart)+",to="+String(settings.chimeEnd)+",savedauto="+String(settings.autoEnabled)+",fav="+String(favoritePath.empty()?0:favoritePath.size()-1);
  line+=",savedslz="+String(savedCalibration.leftZero)+",savedsls="+String(savedCalibration.leftScale)+",savedsrz="+String(savedCalibration.rightZero)+",savedsrs="+String(savedCalibration.rightScale);
  sendReply(line);
}
bool handleExtended(long id,const char *name,char *args) {
  auto ok=[&](const String &message="saved"){sendReply(String(id)+"|OK|"+message);};
  auto fail=[&](const char *message){sendReply(String(id)+"|ERR|"+message);};
  auto persist=[&](const Settings &next){if(saveSettings(next))ok();else fail("SAVE_FAILED");};
  long v[6],n=0;
  if(!strcmp(name,"CONFIG")){sendConfig(id);return true;}
  if(!strcmp(name,"PROFILE")){
    if(!manualReady()){fail("BUSY");return true;}
    if(!protocol::integers(args,v,2,1,20)||v[0]<2||v[1]>3){fail("BAD_VALUE");return true;}
    Settings next=settings;next.speed=v[0];next.repeats=v[1];persist(next);return true;
  }
  if(!strcmp(name,"KEYS")){
    if(!protocol::integers(args,v,5,0,Reminder)){fail("BAD_VALUE");return true;}
    Settings next=settings;for(unsigned i=0;i<5;++i)next.keys[i]=v[i];persist(next);return true;
  }
  if(!strcmp(name,"DEFAULTKEYS")){
    Settings next=settings,defaults;for(unsigned i=0;i<5;++i)next.keys[i]=defaults.keys[i];persist(next);return true;
  }
  if(!strcmp(name,"TIMERPRE")){
    if(!protocol::number(args,1,99,n)){fail("BAD_TIMER");return true;}Settings next=settings;next.timerMinutes=n;persist(next);return true;
  }
  if(!strcmp(name,"POMOCFG")){
    if(countdownActive){fail("BUSY");return true;}
    if(!protocol::integers(args,v,3,1,99)||v[2]>12){fail("BAD_VALUE");return true;}
    Settings next=settings;next.work=v[0];next.rest=v[1];next.rounds=v[2];persist(next);return true;
  }
  if(!strcmp(name,"POMO")){if(startTimer(true))ok("started");else fail("NOT_READY");return true;}
  if(!strcmp(name,"ACTION")){
    if(!protocol::number(args,0,Reminder,n)){fail("BAD_VALUE");return true;}
    if(executeAction(n,true))ok("accepted");else fail(n==Favorite&&favoritePath.empty()?"NO_FAVORITE":"NOT_READY");return true;
  }
  if(!strcmp(name,"CHIME")){
    if(!protocol::integers(args,v,3,0,23)||v[0]>1){fail("BAD_VALUE");return true;}
    Settings next=settings;next.chime=v[0];next.chimeStart=v[1];next.chimeEnd=v[2];persist(next);return true;
  }
  if(!strcmp(name,"GETPLAN")){
    if(!protocol::number(args,0,3,n)){fail("BAD_VALUE");return true;}const auto &p=settings.plans[n];
    sendReply(String(id)+"|PLAN|slot="+String(n)+",enabled="+String(p.enabled)+",hour="+String(p.hour)+",minute="+String(p.minute)+",days="+String(p.days)+",action="+String(p.action));return true;
  }
  if(!strcmp(name,"PLAN")){
    if(!protocol::integers(args,v,6,0,127)||v[0]>3||v[1]>1||v[2]>23||v[3]>59||!v[4]||!Settings::scheduleAction(v[5])){fail("BAD_VALUE");return true;}
    Settings next=settings;auto &p=next.plans[v[0]];p.enabled=v[1];p.hour=v[2];p.minute=v[3];p.days=v[4];p.action=v[5];
    persist(next);return true;
  }
  if(!strcmp(name,"ARM")){
    if(!protocol::number(args,0,1,n)){fail("BAD_VALUE");return true;}plansArmed=n;checkedPlanMinute=time(nullptr)/60;ok();return true;
  }
  if(!strcmp(name,"CALLOAD")){
    if(!calibrationMode){fail("INSTALL_FIRST");return true;}
    calibration=savedCalibration;fault=false;errorMessage="";selectAlignmentPose(!calibrationHalf);if(fault)fail("POSE_FAILED");else ok();return true;
  }
  if(!strcmp(name,"STORE")){
    if(!uploadExpected||uploadPath.size()!=uploadExpected){fail("INCOMPLETE");return true;}
    if(uploadExpected<2){fail("BAD_POINTS");return true;}
    if(uploadExpected>512){fail("FAVORITE_LIMIT");return true;}
    Path candidate=uploadPath;candidate.front().lit=false;candidate.push_back({HOME_X,HOME_Y,0,false});
    auto proceed=[](){delay(1);return !blelink::interrupted();};
    if(!validatePath(candidate,HOME_X,HOME_Y,calibration,proceed)){fail("UNREACHABLE");return true;}
    std::vector<uint8_t> data(uploadExpected*5);
    for(size_t i=0;i<uploadExpected;++i){unsigned x=std::lround(candidate[i].x*100),y=std::lround(candidate[i].y*100);data[i*5]=x;data[i*5+1]=x>>8;data[i*5+2]=y;data[i*5+3]=y>>8;data[i*5+4]=candidate[i].lit;}
    if(!prefs.begin("jc3",false)){fail("SAVE_FAILED");return true;}
    bool saved=prefs.putBytes("favorite",data.data(),data.size())==data.size();prefs.end();
    if(!saved){fail("SAVE_FAILED");return true;}favoritePath=std::move(candidate);clearUpload();taskName="favorite_saved";taskStage=daily::Stage::Complete;ok();return true;
  }
  return false;
}
void timerTick() {
  if(!countdownActive)return;
  unsigned seconds=remaining(millis(),countdownEnd);
  if(!seconds){
    motion.cancel();light(false);
    if(nextPhase(pomoPhase,pomoCycle,settings.rounds)){
      eventSound(pomoPhase==2?SoundEvent::Rest:SoundEvent::Focus);
      board::notify(pomoPhase==2?oledmotion::Notice::Rest:oledmotion::Notice::Focus);
      taskName=pomoPhase==2?"rest":"focus";countdownEnd=millis()+(pomoPhase==2?settings.rest:settings.work)*60000UL;countdownDrawAt=0;
      sendReply(String("0|NOTICE|")+taskName);
    }else{finishTimer();}
  }else if(!motion.busy()&&(!countdownDrawAt||millis()-countdownDrawAt>=15000)){
    if(!motion.start(timePath(seconds/60,seconds%60),1))countdownActive=false;
    countdownDrawAt=millis();
  }
}
void scheduleTick() {
  tm t{};if(!localClock(t))return;
  int64_t minute=time(nullptr)/60;if(minute==checkedPlanMinute)return;checkedPlanMinute=minute;
  if(!plansArmed||calibrationMode||localMenuActive()||dailyNight())return;
  if(settings.chime&&t.tm_min==0&&chimeHour(t.tm_hour,settings.chimeStart,settings.chimeEnd))soundChime(t.tm_hour);
  bool launched=false;
  for(const auto &plan:settings.plans)if(due(plan,t.tm_hour,t.tm_min,t.tm_wday)){
    if(!launched&&manualReady()&&!fault){launched=executeAction(plan.action);if(launched)sendReply("0|NOTICE|schedule_started");else sendReply("0|NOTICE|schedule_failed");}
    else sendReply("0|NOTICE|schedule_skipped");
  }
}
