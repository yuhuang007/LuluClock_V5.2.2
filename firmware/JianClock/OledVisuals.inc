// Included in Board.cpp's private namespace. Original monochrome drawings.
oledmotion::Model visual;
View renderView;
uint8_t slideFrom[1024]{};
uint8_t renderPage=0;
uint32_t renderAt=0,slideAt=0,numberAt=0;
bool captureSlide=false,sliding=false;
char digits[12]="",oldDigits[12]="";
unsigned lastOtaStage=0;
int visualContrast=-1;
bool wakeConsumed=false;
uint32_t renderedFlags=0xffffffff,poseAt=0;
bool previousPose=false,poseInitialized=false;
float renderedVisibility=1.f;
uint8_t *pixels(){return oled.getBufferPtr();}
void dot(int x,int y,bool on=true){
  if(x<0||x>=128||y<0||y>=64)return;
  uint8_t &b=pixels()[(y/8)*128+x];uint8_t m=1U<<(y%8);
  if(on)b|=m;else b&=~m;
}
void line(int x,int y,int ex,int ey){
  int dx=abs(ex-x),sx=x<ex?1:-1,dy=-abs(ey-y),sy=y<ey?1:-1,err=dx+dy;
  for(;;){dot(x,y);if(x==ex&&y==ey)break;int e=err*2;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}
}
void box(int x,int y,int w,int h,bool fill=false){
  for(int j=0;j<h;++j)for(int i=0;i<w;++i)if(fill||j==0||j==h-1||i==0||i==w-1)dot(x+i,y+j);
}
void clearRect(int x,int y,int w,int h){for(int j=0;j<h;++j)for(int i=0;i<w;++i)dot(x+i,y+j,false);}
void circle(int cx,int cy,int r){
  int x=r,y=0,e=1-r;
  while(x>=y){dot(cx+x,cy+y);dot(cx+y,cy+x);dot(cx-y,cy+x);dot(cx-x,cy+y);dot(cx-x,cy-y);dot(cx-y,cy-x);dot(cx+y,cy-x);dot(cx+x,cy-y);
    ++y;if(e<0)e+=2*y+1;else{--x;e+=2*(y-x)+1;}}
}
void check(int x,int y,unsigned amount=100){
  if(amount>0)line(x-5,y,x-2,y+3);
  if(amount>40)line(x-2,y+3,x+6,y-5);
}
void leaf(int x,int y){line(x,y,x+5,y-4);line(x+5,y-4,x+9,y-3);line(x+9,y-3,x+4,y);line(x+4,y,x,y);}
void clockIcon(int x,int y,int r,uint32_t age,bool moving){
  circle(x,y,r);leaf(x+1,y-r-1);
  static const int8_t vx[]={0,7,10,7,0,-7,-10,-7},vy[]={-10,-7,0,7,10,7,0,-7};
  unsigned k=moving?(age/90)%8:1;
  line(x,y,x+vx[k]*r/13,y+vy[k]*r/13);line(x,y,x+r/2,y-r/3);
}
void pen(int x,int y,int offset=0){line(x-5,y+5,x+4,y-4+offset);line(x-3,y+7,x+6,y-2+offset);line(x-5,y+5,x-5,y+9);line(x-5,y+9,x-3,y+7);line(x+4,y-4+offset,x+6,y-2+offset);}
void bell(int x,int y,uint32_t age){int dx=visual.enabled&&age<650?int((age/100)%3)-1:0;box(x-4+dx,y-5,9,9);line(x-6+dx,y+4,x+6+dx,y+4);dot(x,y+6);dot(x,y-7);}
void wifiIcon(int x,int y,uint32_t age){
  unsigned n=visual.enabled?(age/250)%3+1:3;dot(x,y+6);
  for(unsigned i=0;i<n;++i){int w=3+i*3;line(x-w,y+2-i*3,x,y-i*3);line(x,y-i*3,x+w,y+2-i*3);}
}
void progressBar(int x,int y,int w,unsigned percent){
  box(x,y,w,5);unsigned fill=(w-4)*(percent>100?100:percent)/100;
  if(fill)box(x+2,y+2,fill,1,true);
}
const char *noticeText(oledmotion::Notice n){
  using N=oledmotion::Notice;
  switch(n){case N::Connected:return "蓝牙已连接";case N::Disconnected:return "蓝牙已断开";
    case N::Synced:return "时间同步完成";case N::NetworkError:return "联网失败 请查手机";
    case N::DrawStart:return "开始绘制";case N::DrawDone:return "绘制指令完成";
    case N::TimerDone:return "计时结束";case N::Rest:return "休息一下";case N::Focus:return "开始专注";
    case N::UpgradeDone:return "新固件启动成功";case N::Error:return "操作失败 请查手机";
    case N::SettingsSaved:return "日常设置已保存";case N::SettingsCancelled:return "已退出设置";case N::Stopped:return "任务已停止";default:return "";}
}
void renderNotice(uint32_t now){
  using N=oledmotion::Notice;N n=visual.notice;
  float p=visual.enabled?oledmotion::ease(oledmotion::unit(now-visual.noticeAt,180)):1;
  int y=int(-18+18*p);clearRect(0,0,128,18);line(0,y+17,127,y+17);
  oled.setFont(u8g2_font_wqy12_t_gb2312);oled.drawUTF8(23,y+13,noticeText(n));
  uint32_t age=now-visual.noticeAt;
  if(n==N::Connected||n==N::Disconnected){
    int d=n==N::Connected?int(7*(1-p)):int(5*p);
    circle(9-d,y+8,3);circle(14+d,y+8,3);if(n==N::Connected&&age>180)line(9,y+8,14,y+8);
  }else if(n==N::TimerDone||n==N::Rest||n==N::Focus)bell(11,y+9,age);
  else if(n==N::DrawStart)pen(11,y+8,visual.enabled?int(2*(1-p)):0);
  else if(n==N::Error||n==N::NetworkError||n==N::Stopped){circle(11,y+8,6);line(11,y+4,11,y+8);dot(11,y+11);}
  else if(n==N::DrawDone&&visual.enabled&&age<250)pen(11,y+8,-int(age/60));
  else check(11,y+9,visual.enabled?unsigned(oledmotion::unit(age,350)*100):100);
}
void applySlide(uint32_t now){
  if(!sliding)return;
  float t=oledmotion::unit(now-slideAt,260);if(t>=1){sliding=false;return;}
  unsigned shift=unsigned(128*oledmotion::ease(t));
  // Reveal the new page behind a moving vertical edge. Pixels on either side
  // stay still, so each animation step dirties only a narrow vertical band.
  // Full-page translation would rewrite nearly every pixel on every step.
  for(unsigned x=0;x<128-shift;++x)
    for(unsigned p=0;p<8;++p)pixels()[p*128+x]=slideFrom[p*128+x];
}
void prepareVisual(const View &v,uint32_t now){
  if(!poseInitialized){previousPose=v.poseB;poseInitialized=true;}
  if(v.poseB!=renderView.poseB){previousPose=renderView.poseB;poseAt=now;}
  renderView=v;renderPage=currentPage;renderAt=now;renderedVisibility=visual.visibility;
  if(captureSlide){memcpy(slideFrom,displayed,1024);slideAt=now;sliding=visual.enabled&&displayedValid;captureSlide=false;}
  char next[12];
  if(v.timerActive)snprintf(next,sizeof(next),"%02u:%02u",v.timer/60,v.timer%60);
  else snprintf(next,sizeof(next),"%s",v.time);
  if(strcmp(next,digits)){snprintf(oldDigits,sizeof(oldDigits),"%s",digits);snprintf(digits,sizeof(digits),"%s",next);numberAt=now;}
}
void rollDigits(){
  clearRect(0,17,128,31);oled.setFont(u8g2_font_logisoso24_tf);
  float t=visual.enabled?oledmotion::ease(oledmotion::unit(renderAt-numberAt,320)):1;
  int x=5;oled.setClipWindow(0,17,128,48);
  for(unsigned i=0;digits[i]&&i<10;++i){
    char ch[2]={digits[i],0};int width=digits[i]==':'?8:17;
    if(i<strlen(oldDigits)&&oldDigits[i]!=digits[i]&&t<1){char old[2]={oldDigits[i],0};oled.drawUTF8(x,43-int(t*30),old);oled.drawUTF8(x,73-int(t*30),ch);}
    else oled.drawUTF8(x,43,ch);
    x+=width;
  }
  oled.setMaxClipWindow();
}
bool visualRunning(const View &v,uint32_t now){
  return visual.animate(now)||visual.enabled&&(sliding||captureSlide||now-numberAt<320||v.install&&now-poseAt<260||v.ota||v.networkBusy||v.moving);
}
void decorateFrame(){
  const View &v=renderView;uint32_t now=renderAt;
  if(v.menu){
    if((visual.notice==oledmotion::Notice::Error||visual.notice==oledmotion::Notice::SettingsSaved)&&visual.noticeVisible(now))renderNotice(now);
    if(v.menuExitArmed&&visual.pressed&&!wakeConsumed&&now-visual.holdAt>=180){
      clearRect(0,47,128,17);oled.setFont(u8g2_font_wqy12_t_gb2312);
      oled.drawUTF8(0,59,"长按5秒退出设置");progressBar(0,60,128,visual.holdPercent(now,false));
    }
    return;
  }
  bool boot=visual.enabled&&now-visual.bootAt<1050&&!v.install&&!v.fault&&!v.ota;
  if(boot){
    memset(pixels(),0,1024);uint32_t age=now-visual.bootAt;
    int r=5+int(12*oledmotion::ease(oledmotion::unit(age,350)));
    clockIcon(64,27,r,age,true);oled.setFont(u8g2_font_wqy12_t_gb2312);oled.drawUTF8(34,61,"噜噜绘时钟");
  }else if(v.ota){
    clearRect(0,19,30,36);clockIcon(14,35,10,now,false);
    if(v.otaStage==3){int y=25+(visual.enabled?(now/90)%13:7);line(14,y-5,14,y+3);line(10,y-1,14,y+3);line(18,y-1,14,y+3);}
    else if(v.otaStage==1)wifiIcon(14,36,now);
    else if(v.otaStage==4)circle(14,35,4+(visual.enabled?(now/140)%3:1));
    progressBar(34,45,91,v.otaProgress);
  }else if(v.fault){
    // Failure stays legible. One short horizontal nudge, no perpetual flashing.
    circle(119,8,6);line(119,4,119,8);dot(119,11);
  }else if(v.install){
    clearRect(0,30,128,34);
    int lx=v.poseB?38:18,ly=v.poseB?34:58,rx=v.poseB?110:90,ry=v.poseB?58:34;
    if(visual.enabled&&now-poseAt<260){
      float t=oledmotion::ease(oledmotion::unit(now-poseAt,260));
      int olx=previousPose?38:18,oly=previousPose?34:58,orx=previousPose?110:90,ory=previousPose?58:34;
      lx=olx+int((lx-olx)*t);ly=oly+int((ly-oly)*t);rx=orx+int((rx-orx)*t);ry=ory+int((ry-ory)*t);
    }
    circle(38,58,3);circle(90,58,3);line(38,58,lx,ly);line(90,58,rx,ry);
    circle(lx,ly,2);circle(rx,ry,2);
    oled.setFont(u8g2_font_wqy12_t_gb2312);oled.drawUTF8(1,43,v.poseB?"B":"A");
  }else if(v.timerActive){
    rollDigits();unsigned total=visual.timerTotal?visual.timerTotal:1;
    progressBar(4,46,120,v.timer>total?100:v.timer*100/total);
  }else if(v.moving){
    pen(14,36,visual.enabled?int((now/200)%3)-1:0);progressBar(32,43,92,v.progress);
  }else if(v.stage!=static_cast<unsigned>(daily::Stage::Preparing)&&renderPage==0){rollDigits();}
  if(!boot&&!v.ota&&!v.fault&&!v.install&&v.networkBusy){
    clearRect(0,0,128,17);wifiIcon(10,8,now);oled.setFont(u8g2_font_wqy12_t_gb2312);oled.drawUTF8(24,13,v.syncing?"正在校时":"正在连接网络");
  }
  applySlide(now);
  if(!boot&&!v.ota&&!v.fault&&!v.install&&!v.moving&&!v.timerActive){
    // Navigation stays in place while the page underneath changes.
    clearRect(98,0,30,14);
    for(unsigned i=0;i<3;++i){
      int cx=102+i*10;circle(cx,6,3);
      if(i==renderPage)for(int y=-2;y<=2;++y)for(int x=-2;x<=2;++x)
        if(x*x+y*y<=7)dot(cx+x,6+y);
    }
  }
  if(!boot&&!v.ota&&!v.fault&&!v.install&&visual.noticeVisible(now))renderNotice(now);
  if(visual.pressed&&!wakeConsumed&&!v.moving&&!v.ota&&!v.timerActive&&now-visual.holdAt>=180){
    clearRect(0,47,128,17);oled.setFont(u8g2_font_wqy12_t_gb2312);
    const char *hint=v.install?"长按退出装臂":now-visual.holdAt>=1500?"松开执行 / 续按设置":"长按5秒进设置";
    oled.drawUTF8(0,59,hint);progressBar(0,60,128,visual.holdPercent(now,v.install));
  }
  // Closing/opening aperture plus hardware contrast fade: no fake grayscale.
  if(renderedVisibility<1){int margin=int((1-renderedVisibility)*32);clearRect(0,0,128,margin);clearRect(0,64-margin,128,margin);}
}
