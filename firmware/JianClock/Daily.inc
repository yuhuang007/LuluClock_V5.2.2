// Included after Extended.inc. Settings are separate from legacy Settings/NVS.
bool localMenuOpen=false,menuSuppress=false,menuReleasePending=false;
uint32_t menuTouched=0,dailyRevision=0;
unsigned menuItem=0;
daily::Config menuDraft;
ButtonLogic menuButton;
bool localMenuActive(){return localMenuOpen;}
bool saveDaily(const daily::Config &c);
void readDaily(){
  Preferences p;daily::Config candidate;bool migrated=false;
  if(p.begin("jc_daily",true)){
    if(p.getBytesLength("config")==sizeof(candidate)&&p.getBytes("config",&candidate,sizeof(candidate))==sizeof(candidate)){
      if(candidate.valid())dailyConfig=candidate;
      else if(daily::migrate(candidate)){dailyConfig=candidate;migrated=true;}
    }
    p.end();
  }
  if(migrated)saveDaily(dailyConfig);
}
bool saveDaily(const daily::Config &c){
  if(!c.valid())return false;Preferences p;if(!p.begin("jc_daily",false))return false;
  bool ok=p.putBytes("config",&c,sizeof(c))==sizeof(c);p.end();
  if(ok){dailyConfig=c;++dailyRevision;}return ok;
}
bool dailyNight(){tm t{};return localClock(t)&&daily::night(dailyConfig,t.tm_hour*60+t.tm_min);}
daily::Stage currentStage(){
  if(fault)return daily::Stage::Error;
  if(uploadExpected)return daily::Stage::Uploading;
  if(motion.busy())return taskName=="home"||motion.returningHome()?daily::Stage::Homing:daily::Stage::Drawing;
  if(countdownActive)return daily::Stage::Waiting;
  return taskStage;
}
unsigned nextAutomatic(){
  if(!autoDraw||needsHome||fault||calibrationMode||!clockReady)return 0xffffffffU;
  static time_t at=0;static int64_t used=-2;static uint32_t revision=~0U;static unsigned value=0xffffffffU;
  time_t now=time(nullptr);
  if(now!=at||used!=lastMinute||revision!=dailyRevision){
    tm t{};if(!localClock(t))return 0xffffffffU;
    value=daily::wait(dailyConfig,t.tm_hour*60+t.tm_min,t.tm_sec,now/60==lastMinute);
    at=now;used=lastMinute;revision=dailyRevision;
  }
  return value;
}
void sendDaily(long id){
  sendReply(String(id)+"|DAILY|every="+dailyConfig.every+",from="+dailyConfig.from+",to="+dailyConfig.to+
    ",night="+dailyConfig.night+",nfrom="+dailyConfig.nightFrom+",nto="+dailyConfig.nightTo+
    ",dim="+dailyConfig.brightness+",ambient="+dailyConfig.ambient+",darklow="+dailyConfig.darkLow+
    ",active="+dailyNight()+",next="+String(nextAutomatic()==0xffffffffU?-1:static_cast<long>(nextAutomatic())));
}
bool handleDaily(long id,const char *name,char *args){
  if(!strcmp(name,"DAILY")||!strcmp(name,"DAILYSET")){
    if(!strcmp(name,"DAILYSET")){
      long v[9];if(!protocol::integers(args,v,9,0,1439)){sendReply(String(id)+"|ERR|BAD_VALUE");return true;}
      daily::Config c;c.every=v[0];c.from=v[1];c.to=v[2];
      // Validate before narrowing fields to uint8_t.
      if(v[3]>1||v[6]<5||v[6]>100||v[7]>1||v[8]>1){sendReply(String(id)+"|ERR|BAD_VALUE");return true;}
      c.night=v[3];c.nightFrom=v[4];c.nightTo=v[5];c.brightness=v[6];c.ambient=v[7];c.darkLow=v[8];
      if(!c.valid()){sendReply(String(id)+"|ERR|BAD_VALUE");return true;}
      if(!saveDaily(c)){sendReply(String(id)+"|ERR|SAVE_FAILED");return true;}
      board::notify(oledmotion::Notice::SettingsSaved);
    }
    sendDaily(id);return true;
  }
  if(!strcmp(name,"JOBINFO")){
    sendReply(String(id)+"|JOB|job="+taskSerial+",task="+taskName+",stage="+daily::name(currentStage())+
      ",busy="+motion.busy()+",pct="+(motion.busy()?motion.progress():taskStage==daily::Stage::Complete?100:0)+
      ",eta="+motion.eta()+",needhome="+needsHome);return true;
  }
  if(!strcmp(name,"LIGHTINFO")){
    sendReply(String(id)+"|LIGHT|raw="+board::lightRaw()+",stable="+board::lightStable()+",verified="+board::lightVerified()+
      ",age="+board::lightAge()+",automatic="+dailyConfig.ambient+",darklow="+dailyConfig.darkLow+",strip="+board::stripOn());return true;
  }
  return false;
}
void closeMenu(bool saved){
  localMenuOpen=false;menuSuppress=true;board::suppressSideKeys();
  board::notify(saved?oledmotion::Notice::SettingsSaved:oledmotion::Notice::SettingsCancelled);
}
void changeMenu(){
  auto hour=[](uint16_t &m){m=((m/60+1)%24)*60;};
  switch(menuItem){
    case 0:{const unsigned steps[]={1,5,15,30,60};unsigned next=1;for(auto s:steps)if(s>menuDraft.every){next=s;break;}menuDraft.every=next;break;}
    case 1:hour(menuDraft.from);break;case 2:hour(menuDraft.to);break;
    case 3:menuDraft.night=!menuDraft.night;break;
    case 4:hour(menuDraft.nightFrom);break;case 5:hour(menuDraft.nightTo);break;
    case 6:menuDraft.brightness=menuDraft.brightness>=30?5:menuDraft.brightness+5;break;
    case 7:menuDraft.ambient=!menuDraft.ambient;break;
    case 8:menuDraft.darkLow=!menuDraft.darkLow;break;
    default:break;
  }
}
bool localSettingsKeys(){
  bool l=digitalRead(config::LEFT_BUTTON)==LOW,r=digitalRead(config::RIGHT_BUTTON)==LOW;
  bool allowed=!motion.busy()&&!countdownActive&&!uploadExpected&&!calibrationMode&&!ota::active()&&!wifiscan::busy();
  if(menuSuppress){board::suppressSideKeys();if(!l&&!r)menuSuppress=false;return true;}
  if(!localMenuOpen)return false;
  if(!allowed){closeMenu(false);return false;}
  if(digitalRead(config::BUTTON)==HIGH)menuReleasePending=false;
  if(board::leftPress()){menuItem=(menuItem+1)%10;menuTouched=millis();}
  if(board::rightPress()){changeMenu();menuTouched=millis();}
  auto action=menuButton.poll(millis(),digitalRead(config::BUTTON)==LOW,false,false);
  if(action==ButtonEvent::Single){if(saveDaily(menuDraft))board::notify(oledmotion::Notice::SettingsSaved);else board::notify(oledmotion::Notice::Error);}
  else if(action==ButtonEvent::VeryLong)closeMenu(false);
  else if(action!=ButtonEvent::None)menuTouched=millis();
  if(digitalRead(config::BUTTON)==LOW)menuTouched=millis();
  return true;
}
bool openLocalMenu(){
  if(localMenuOpen||motion.busy()||countdownActive||uploadExpected||calibrationMode||ota::active()||wifiscan::busy())return false;
  localMenuOpen=true;menuDraft=dailyConfig;menuItem=0;menuTouched=millis();
  menuReleasePending=digitalRead(config::BUTTON)==LOW;
  menuButton.begin(millis(),menuReleasePending);board::suppressSideKeys();return true;
}
void localSettingsTick(){} // Exit is explicit: hold the middle key for 5 seconds.
void fillDailyView(board::View &v){
  v.night=dailyNight();v.nightBrightness=dailyConfig.brightness;
  v.policyRevision=dailyRevision;v.ambient=dailyConfig.ambient;v.darkLow=dailyConfig.darkLow;
  v.stage=static_cast<unsigned>(currentStage());v.needsHome=needsHome;
  v.nextAuto=nextAutomatic();v.eta=motion.eta();v.menu=localMenuOpen;v.menuExitArmed=!menuReleasePending;
  if(!localMenuOpen)return;
  static const char *names[]={"自动绘时间隔","绘时开始时刻","绘时结束时刻","夜间模式","夜间开始时刻","夜间结束时刻","夜间屏幕亮度","光敏自动灯带","暗光输出电平","光敏信号检测"};
  snprintf(v.menuTitle,sizeof(v.menuTitle),"日常设置 %u/10",menuItem+1);
  snprintf(v.menuName,sizeof(v.menuName),"%s",names[menuItem]);
  switch(menuItem){
    case 0:snprintf(v.menuValue,sizeof(v.menuValue),"每 %u 分钟",menuDraft.every);break;
    case 1:case 2:case 4:case 5:{unsigned m=menuItem==1?menuDraft.from:menuItem==2?menuDraft.to:menuItem==4?menuDraft.nightFrom:menuDraft.nightTo;snprintf(v.menuValue,sizeof(v.menuValue),"%02u:%02u",m/60,m%60);break;}
    case 3:snprintf(v.menuValue,sizeof(v.menuValue),"%s",menuDraft.night?"开启":"关闭");break;
    case 6:snprintf(v.menuValue,sizeof(v.menuValue),"%u%%",menuDraft.brightness);break;
    case 7:snprintf(v.menuValue,sizeof(v.menuValue),"%s",menuDraft.ambient?board::lightVerified()?"自动启用":"开启 / 待验证":"手动控制");break;
    case 8:snprintf(v.menuValue,sizeof(v.menuValue),"%s",menuDraft.darkLow?"低电平为暗":"高电平为暗");break;
    default:snprintf(v.menuValue,sizeof(v.menuValue),"DO %u %s",board::lightRaw(),board::lightVerified()?"已见变化":"待遮光测试");break;
  }
}
