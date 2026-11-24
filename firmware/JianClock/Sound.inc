// Included inside Firmware.cpp. GPIO7 uses a separate LEDC channel from servos.
SoundSettings soundSettings;
SoundPlayer soundPlayer;
bool buzzerReady=false;
unsigned buzzerHz=0;
bool soundMuted(){tm t{};return quiet||dailyNight()||(soundSettings.night&&localClock(t)&&silentHour(t.tm_hour,soundSettings.from,soundSettings.to));}
void stopBeep(){soundPlayer.stop();if(buzzerReady)ledcWriteTone(config::BUZZER,0);buzzerHz=0;}
bool playSound(unsigned tone,unsigned repeats=1,unsigned priority=1){
 if(soundMuted())return false;
 if(!buzzerReady)buzzerReady=ledcAttachChannel(config::BUZZER,2000,10,4);
 return buzzerReady&&soundPlayer.start(tone,millis(),repeats,priority);
}
bool startBeep(){return playSound(6,3,3);}
bool soundAlert(){return playSound(soundSettings.ring,soundSettings.repeats,2);}
void eventSound(SoundEvent event){
 unsigned flag=event==SoundEvent::Button?KeySound:event==SoundEvent::Drawing?DrawingSound:
  event==SoundEvent::Connected?ConnectionSound:event==SoundEvent::Error?ErrorSound:TimerSound;
 if(!(soundSettings.flags&flag))return;
 if(event==SoundEvent::Timer){soundAlert();return;}
 unsigned tone=event==SoundEvent::Button?0:event==SoundEvent::Drawing?1:event==SoundEvent::Rest?2:
  event==SoundEvent::Focus?3:event==SoundEvent::Connected?7:5;
 playSound(tone,1,event==SoundEvent::Error?3:event==SoundEvent::Rest||event==SoundEvent::Focus?2:event==SoundEvent::Button?0:1);
}
void soundChime(unsigned hour){playSound(6,hour%12?hour%12:12,1);}
void buzzerTick(){
 if(!soundPlayer.busy())return;
 if(soundMuted()){stopBeep();return;}
 soundPlayer.tick(millis());unsigned frequency=soundPlayer.frequency();
 if(buzzerReady&&frequency!=buzzerHz){ledcWriteTone(config::BUZZER,frequency);buzzerHz=frequency;}
}
void readSounds(){
 SoundSettings next;
 if(prefs.begin("jc3",true)){
  if(prefs.getBytesLength("sound")==sizeof(next)&&prefs.getBytes("sound",&next,sizeof(next))==sizeof(next)&&next.valid())soundSettings=next;
  prefs.end();
 }
}
bool saveSounds(const SoundSettings &next){
 if(!next.valid()||!prefs.begin("jc3",false))return false;
 bool saved=prefs.putBytes("sound",&next,sizeof(next))==sizeof(next);prefs.end();
 if(saved){soundSettings=next;if(soundMuted())stopBeep();}return saved;
}
void sendSounds(long id){
 sendReply(String(id)+"|SOUND|flags="+String(soundSettings.flags)+",ring="+String(soundSettings.ring)+",repeats="+String(soundSettings.repeats)+",night="+String(soundSettings.night)+",from="+String(soundSettings.from)+",to="+String(soundSettings.to)+",playing="+String(soundPlayer.busy()));
}
bool handleSound(long id,const char *name,char *args){
 auto ok=[&](){sendReply(String(id)+"|OK|done");};
 auto fail=[&](const char *error){sendReply(String(id)+"|ERR|"+error);};
 if(!strcmp(name,"SOUNDINFO")){sendSounds(id);return true;}
 if(!strcmp(name,"SILENCE")){stopBeep();ok();return true;}
 if(!strcmp(name,"SOUNDCFG")){
  long v[6];if(!protocol::integers(args,v,6,0,31)){fail("BAD_VALUE");return true;}
  SoundSettings next;next.flags=v[0];next.ring=v[1];next.repeats=v[2];next.night=v[3];next.from=v[4];next.to=v[5];
  if(!next.valid())fail("BAD_VALUE");else if(saveSounds(next))ok();else fail("SAVE_FAILED");return true;
 }
 if(!strcmp(name,"SOUND")||!strcmp(name,"ALERT")){
  long n=soundSettings.ring;bool alert=!strcmp(name,"ALERT");
  if(!alert&&!protocol::number(args,0,7,n)){fail("BAD_VALUE");return true;}
  if(playSound(n,alert?soundSettings.repeats:1,3))ok();else fail(quiet?"QUIET":soundMuted()?"NIGHT_QUIET":"PWM_FAILED");return true;
 }
 return false;
}
