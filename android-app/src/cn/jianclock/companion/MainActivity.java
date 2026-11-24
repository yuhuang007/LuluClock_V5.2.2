package cn.jianclock.companion;

import android.Manifest;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.app.UiModeManager;
import android.bluetooth.*;
import android.bluetooth.le.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.*;
import android.webkit.*;
import android.view.View;
import android.view.Display;
import android.view.WindowManager;
import android.view.animation.PathInterpolator;
import android.widget.FrameLayout;
import android.net.*;
import org.json.JSONObject;
import org.json.JSONArray;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PathMeasure;
import android.graphics.RectF;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

public final class MainActivity extends Activity {
  static final UUID SERVICE=UUID.fromString("f0c10001-67a4-4435-b5d3-9d10d7e328a1");
  static final UUID COMMAND=UUID.fromString("f0c10002-67a4-4435-b5d3-9d10d7e328a1");
  static final UUID EVENT=UUID.fromString("f0c10003-67a4-4435-b5d3-9d10d7e328a1");
  static final UUID STOP=UUID.fromString("f0c10004-67a4-4435-b5d3-9d10d7e328a1");
  static final UUID CCC=UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
  final Handler handler=new Handler(Looper.getMainLooper());
  final Map<String,BluetoothDevice> devices=new LinkedHashMap<>();
  final Map<String,String> deviceNames=new LinkedHashMap<>();
  final ArrayDeque<Tx> pending=new ArrayDeque<>();
  final ByteArrayOutputStream incoming=new ByteArrayOutputStream();
  WebView web;
  UiTransitions uiTransitions;
  BrandDialogs dialogs;
  ValueAnimator appearanceAnimator;
  OtaManager ota;
  final OtaReconnect otaRecovery=new OtaReconnect();
  boolean recoveryStarting=false,otaTransferActive=false;
  String otaAddress="",otaSession="";
  final Runnable recoveryTimeout=()->endOtaRecovery("timeout");
  final Runnable recoveryAttempt=this::attemptOtaReconnect;
  ConnectivityManager connectivity;
  ConnectivityManager.NetworkCallback wifiCallback;
  BluetoothAdapter adapter;
  BluetoothGatt gatt;
  BluetoothGattCharacteristic commands,stopChar;
  Tx current;
  boolean ready=false,scanning=false,destroyed=false;
  int applicationNightPreference=Integer.MIN_VALUE;
  int appearanceTargetColor=Integer.MIN_VALUE;
  int generation=0,scanGeneration=0;
  static final class Tx {
    final BluetoothGattCharacteristic characteristic; final byte[] bytes;
    Tx(BluetoothGattCharacteristic c,byte[] b) { characteristic=c;bytes=b; }
  }
  @Override public void onCreate(Bundle bundle) {
    setTheme(R.style.AppTheme);
    super.onCreate(bundle);
    preferSmoothDisplay();
    ota=new OtaManager(this,(type,pairs)->handler.post(()->handleOtaEvent(type,pairs)));
    // A foreground tool: keep the screen awake while checking moving arms.
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    applyAppearance(getPreferences(MODE_PRIVATE).getString("appearance","system"));
    if (Build.VERSION.SDK_INT>=35) getWindow().setDecorFitsSystemWindows(true);
    BluetoothManager manager=(BluetoothManager)getSystemService(BLUETOOTH_SERVICE);
    adapter=manager==null ? null : manager.getAdapter();
    web=new WebView(this);
    web.getSettings().setJavaScriptEnabled(true);
    web.getSettings().setDomStorageEnabled(true);
    // JS confirmations and text prompts require a WebChromeClient in Android.
    dialogs=new BrandDialogs(this);
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onJsAlert(WebView view,String url,String message,JsResult result){return dialogs.show(message,null,result,DialogSpec.Kind.ALERT);}
      @Override public boolean onJsConfirm(WebView view,String url,String message,JsResult result){return dialogs.show(message,null,result,DialogSpec.Kind.CONFIRM);}
      @Override public boolean onJsPrompt(WebView view,String url,String message,String value,JsPromptResult result){return dialogs.show(message,value,result,DialogSpec.Kind.PROMPT);}
    });
    if(Build.VERSION.SDK_INT>=33)web.getSettings().setAlgorithmicDarkeningAllowed(false);
    else if(Build.VERSION.SDK_INT>=29)web.getSettings().setForceDark(WebSettings.FORCE_DARK_OFF);
    applyAppearance(getPreferences(MODE_PRIVATE).getString("appearance","system"));
    web.getSettings().setAllowFileAccess(false);
    web.getSettings().setAllowContentAccess(false);
    web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    web.addJavascriptInterface(new Bridge(),"ClockNative");
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) { return true; }
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request) {
        if (!request.getUrl().toString().startsWith("file:///android_asset/"))
          return new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0]));
        return null;
      }
    });
    FrameLayout surface=new FrameLayout(this);
    surface.addView(web,new FrameLayout.LayoutParams(-1,-1));
    boolean launchDark="dark".equals(getPreferences(MODE_PRIVATE).getString("appearance","system"))||
      ("system".equals(getPreferences(MODE_PRIVATE).getString("appearance","system"))&&
      (getResources().getConfiguration().uiMode&Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES);
    uiTransitions=new UiTransitions(this,web,surface,handler,launchDark?0xff181a17:0xfffaf7f0);
    setContentView(surface); web.loadUrl("file:///android_asset/index.html");
    connectivity=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
    wifiCallback=new ConnectivityManager.NetworkCallback(){@Override public void onAvailable(Network network){event("otaCheck","reason","wifi_connected");}};
    try{connectivity.registerNetworkCallback(new NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build(),wifiCallback);}catch(Exception ignored){}
  }
  void attemptOtaReconnect(){
    if(destroyed||!otaRecovery.active)return;
    if(!otaRecovery.attempt(SystemClock.elapsedRealtime())){endOtaRecovery("timeout");return;}
    event("otaRecovery","state","connecting","session",otaSession,"attempt",String.valueOf(otaRecovery.attempts));
    if(adapter==null||!adapter.isEnabled()){scheduleOtaReconnect();return;}
    recoveryStarting=true;
    try {String address=otaRecovery.address;devices.put(address,adapter.getRemoteDevice(address));connect(address);}
    catch(Exception ignored){scheduleOtaReconnect();}
    finally{recoveryStarting=false;}
  }
  static String pair(String[] pairs,String key){for(int i=0;i+1<pairs.length;i+=2)if(key.equals(pairs[i]))return pairs[i+1];return "";}
  void handleOtaEvent(String type,String... pairs){
    if(destroyed)return;
    String session=pair(pairs,"session");
    if(!session.isEmpty()&&!session.equals(otaSession))return;
    if(type.equals("otaResult")){
      otaTransferActive=false;
      String status=pair(pairs,"status");
      if(status.equals("accepted")||status.equals("uncertain"))beginOtaRecovery();
      else endOtaRecovery("ended");
    }
    event(type,pairs);
  }
  void beginOtaRecovery(){
    if(destroyed||otaSession.isEmpty()||!otaRecovery.begin(otaAddress,SystemClock.elapsedRealtime()))return;
    event("otaRecovery","state","waiting","session",otaSession);
    // Stop periodic BLE writes during the reboot; create a fresh GATT for the same board.
    recoveryStarting=true;try{disconnect();}finally{recoveryStarting=false;}
    handler.postDelayed(recoveryAttempt,4500);
    handler.postDelayed(recoveryTimeout,OtaReconnect.TIMEOUT_MS);
  }
  void scheduleOtaReconnect(){
    if(!otaRecovery.active)return;
    handler.removeCallbacks(recoveryAttempt);handler.postDelayed(recoveryAttempt,otaRecovery.delay());
  }
  void endOtaRecovery(String status){
    boolean was=otaRecovery.active;otaRecovery.stop();handler.removeCallbacks(recoveryAttempt);handler.removeCallbacks(recoveryTimeout);
    if(was)event("otaRecovery","state",status,"session",otaSession);
    otaTransferActive=false;otaSession="";otaAddress="";
    // Invalidate an unfinished GATT attempt so timeout/cancel cannot connect later.
    if(was&&!ready&&gatt!=null)disconnect();
  }
  void cancelOtaRecovery(){endOtaRecovery("cancelled");otaTransferActive=false;otaSession="";otaAddress="";ota.cancel();}
  void event(String type,String... pairs) {
    if (destroyed) return;
    if(type.equals("error")&&(otaRecovery.active||(otaTransferActive&&ota.allBytesSent)))return;
    try {
      JSONObject object=new JSONObject();object.put("type",type);
      for(int i=0;i+1<pairs.length;i+=2)object.put(pairs[i],pairs[i+1]);
      String script="window.onNativeEvent&&window.onNativeEvent("+object.toString()+");";
      handler.post(()->{ if(!destroyed)web.evaluateJavascript(script,null); });
    } catch(Exception ignored) { }
  }
  @Override public void onBackPressed(){
    if(web==null){super.onBackPressed();return;}
    web.evaluateJavascript("Boolean(window.handleAppBack&&window.handleAppBack())",result->{
      if(!"true".equals(result))MainActivity.super.onBackPressed();
    });
  }
  void applyAppearance(String preference){
    applyAppearance(preference,false);
  }
  void applyAppearance(String preference,boolean animated){
    // Android 12+ stores this app-specific mode for the OS starting window.
    // Resource night colors now follow the chosen App theme on the next cold launch.
    if(Build.VERSION.SDK_INT>=31){
      UiModeManager modes=(UiModeManager)getSystemService(UI_MODE_SERVICE);
      // For this application API, AUTO clears the package night override
      // (UI_MODE_NIGHT_UNDEFINED), so "system" follows the device setting.
      int selected="light".equals(preference)?UiModeManager.MODE_NIGHT_NO:
        "dark".equals(preference)?UiModeManager.MODE_NIGHT_YES:UiModeManager.MODE_NIGHT_AUTO;
      if(modes!=null&&applicationNightPreference!=selected){applicationNightPreference=selected;modes.setApplicationNightMode(selected);}
    }
    boolean dark="dark".equals(preference)||("system".equals(preference)&&
      (getResources().getConfiguration().uiMode&Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES);
    int background=dark?0xff181a17:0xfffaf7f0;
    // The app-night update emits uiMode again; do not restart the same fade.
    if(appearanceTargetColor==background&&appearanceAnimator!=null&&appearanceAnimator.isRunning())return;
    appearanceTargetColor=background;
    if(appearanceAnimator!=null){appearanceAnimator.cancel();appearanceAnimator=null;}
    int flags=dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
    int start=getWindow().getStatusBarColor();
    if(!animated||start==background){
      getWindow().setStatusBarColor(background);getWindow().setNavigationBarColor(background);
      getWindow().getDecorView().setSystemUiVisibility(flags);
      if(web!=null)web.setBackgroundColor(background);
      return;
    }
    appearanceAnimator=ValueAnimator.ofArgb(start,background);
    if(web!=null)web.setBackgroundColor(background);
    appearanceAnimator.setDuration(480);appearanceAnimator.setInterpolator(new PathInterpolator(.2f,.8f,.2f,1f));
    appearanceAnimator.addUpdateListener(animator->{
      if(destroyed)return;
      int color=(Integer)animator.getAnimatedValue();
      getWindow().setStatusBarColor(color);getWindow().setNavigationBarColor(color);
      if(animator.getAnimatedFraction()>=.45f)getWindow().getDecorView().setSystemUiVisibility(flags);
    });
    appearanceAnimator.start();
  }
  @Override public void onConfigurationChanged(Configuration configuration){
    super.onConfigurationChanged(configuration);
    preferSmoothDisplay();
    applyAppearance(getPreferences(MODE_PRIVATE).getString("appearance","system"),true);
  }
  boolean permissions() {
    if (Build.VERSION.SDK_INT>=31) {
      if(checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN)!=PackageManager.PERMISSION_GRANTED ||
          checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)!=PackageManager.PERMISSION_GRANTED) {
        requestPermissions(new String[]{Manifest.permission.BLUETOOTH_SCAN,Manifest.permission.BLUETOOTH_CONNECT},7);return false;
      }
    } else if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED) {
      requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION},7);return false;
    }
    return true;
  }
  void preferSmoothDisplay(){
    // Request the fastest supported mode at the current resolution. Battery saver
    // and the user's display settings retain the final say on Xiaomi / Android.
    Display display=getWindowManager().getDefaultDisplay();
    if(display==null)return;
    Display.Mode currentMode=display.getMode(),best=currentMode;
    for(Display.Mode mode:display.getSupportedModes()){
      if(mode.getPhysicalWidth()==currentMode.getPhysicalWidth()&&mode.getPhysicalHeight()==currentMode.getPhysicalHeight()&&mode.getRefreshRate()>best.getRefreshRate())best=mode;
    }
    WindowManager.LayoutParams params=getWindow().getAttributes();
    params.preferredDisplayModeId=best.getModeId();params.preferredRefreshRate=best.getRefreshRate();
    getWindow().setAttributes(params);
  }
  @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] result) {
    super.onRequestPermissionsResult(request,permissions,result);
    if(request==7) {
      boolean granted=result.length>0; for(int v:result)granted&=v==PackageManager.PERMISSION_GRANTED;
      if(granted)scan();else event("error","message","请允许附近设备权限。Android 11 及更早系统还需要定位权限。");
    }
  }
  final ScanCallback scanCallback=new ScanCallback() {
    @Override public void onScanResult(int type,ScanResult result) {
      handler.post(()->{
        if(!scanning)return;
        BluetoothDevice device=result.getDevice();String address=device.getAddress();devices.put(address,device);
        String name=result.getScanRecord()==null?null:result.getScanRecord().getDeviceName();
        if(name==null||name.trim().isEmpty())name=device.getName();
        if(name==null||name.trim().isEmpty())name=deviceNames.get(address);
        if(name==null||name.trim().isEmpty())name="未命名时钟";
        deviceNames.put(address,name);
        event("device","name",name,"address",address,"rssi",String.valueOf(result.getRssi()));
      });
    }
    @Override public void onScanFailed(int code) { handler.post(()->{scanning=false;event("scan","active","0");event("error","message","扫描失败："+code);}); }
  };
  void scan() {
    if(!permissions())return;
    if(adapter==null) {event("error","message","这台手机不支持蓝牙。");return;}
    if(!adapter.isEnabled()) {startActivityForResult(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE),8);return;}
    stopScan();int scanToken=++scanGeneration;devices.clear();deviceNames.clear();scanning=true;event("scan","active","1");
    try {
      adapter.getBluetoothLeScanner().startScan(Collections.singletonList(new ScanFilter.Builder().setServiceUuid(new ParcelUuid(SERVICE)).build()),
        new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(),scanCallback);
      handler.postDelayed(()->{if(scanToken==scanGeneration){stopScan();event("scan","active","0");}},12000);
    } catch(Exception exception) {scanning=false;event("scan","active","0");event("error","message",exception.toString());}
  }
  @Override protected void onActivityResult(int request,int result,Intent data) {super.onActivityResult(request,result,data);if(request==OtaManager.PICK){ota.result(result,data);return;}if(request==8 && result==RESULT_OK)scan();}
  void stopScan() {
    scanGeneration++;
    if(scanning && adapter!=null)try{adapter.getBluetoothLeScanner().stopScan(scanCallback);}catch(Exception ignored){}
    scanning=false;
  }
  void disconnect() {
    if(dialogs!=null)dialogs.cancel();
    generation++;ready=false;pending.clear();current=null;incoming.reset();commands=null;stopChar=null;
    BluetoothGatt old=gatt;gatt=null;
    if(old!=null)try{old.disconnect();old.close();}catch(Exception ignored){}
    if(!recoveryStarting&&otaTransferActive&&ota.allBytesSent&&!otaRecovery.active)beginOtaRecovery();
    event("connection","state","disconnected");
    if(!recoveryStarting&&otaRecovery.active)scheduleOtaReconnect();
  }
  void connect(String address) {
    if(!permissions())return;
    BluetoothDevice device=devices.get(address);
    if(device==null){event("error","message","请先扫描并选择设备。");return;}
    stopScan();disconnect();getPreferences(MODE_PRIVATE).edit().putString("lastDevice",address).apply();event("connection","state","connecting","address",address,"name",deviceNames.get(address));
    try {gatt=device.connectGatt(this,false,gattCallback,BluetoothDevice.TRANSPORT_LE);}
    catch(Exception exception){event("error","message",exception.toString());}
    int token=generation;handler.postDelayed(()->{if(token==generation && !ready){event("error","message","连接超时，请靠近设备后重试。");disconnect();}},15000);
  }
  final BluetoothGattCallback gattCallback=new BluetoothGattCallback() {
    @Override public void onConnectionStateChange(BluetoothGatt g,int status,int state) {
      handler.post(()->{
        if(g!=gatt)return;
        if(status==BluetoothGatt.GATT_SUCCESS && state==BluetoothProfile.STATE_CONNECTED) {
          event("phase","message","已连接，正在发现服务…");
          if(!g.discoverServices()){event("error","message","无法发现设备服务。");disconnect();}
        } else if(state==BluetoothProfile.STATE_DISCONNECTED || status!=BluetoothGatt.GATT_SUCCESS)disconnect();
      });
    }
    @Override public void onServicesDiscovered(BluetoothGatt g,int status) {
      handler.post(()->{
        if(g!=gatt)return;
        BluetoothGattService service=g.getService(SERVICE);
        if(status!=BluetoothGatt.GATT_SUCCESS || service==null){event("error","message","设备固件不支持绘时钟蓝牙服务。");disconnect();return;}
        commands=service.getCharacteristic(COMMAND);stopChar=service.getCharacteristic(STOP);
        BluetoothGattCharacteristic notify=service.getCharacteristic(EVENT);
        if(commands==null || stopChar==null || notify==null){event("error","message","固件蓝牙接口不完整。");disconnect();return;}
        event("phase","message","正在订阅时钟状态…");
        BluetoothGattDescriptor descriptor=notify.getDescriptor(CCC);
        if(descriptor==null || !g.setCharacteristicNotification(notify,true)){event("error","message","无法订阅设备消息。");disconnect();return;}
        boolean queued;
        if(Build.VERSION.SDK_INT>=33)queued=g.writeDescriptor(descriptor,BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)==BluetoothStatusCodes.SUCCESS;
        else {descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);queued=g.writeDescriptor(descriptor);}
        if(!queued){event("error","message","消息订阅失败。");disconnect();}
      });
    }
    @Override public void onDescriptorWrite(BluetoothGatt g,BluetoothGattDescriptor descriptor,int status) {
      handler.post(()->{if(g!=gatt)return;if(status==BluetoothGatt.GATT_SUCCESS){ready=true;
          if(otaRecovery.active){handler.removeCallbacks(recoveryAttempt);event("otaRecovery","state","connected","session",otaSession);}
          String address=g.getDevice().getAddress();event("connection","state","ready","address",address,"name",deviceNames.get(address));pump();}
        else{event("error","message","无法启用消息通知。");disconnect();}});
    }
    @Override public void onCharacteristicChanged(BluetoothGatt g,BluetoothGattCharacteristic characteristic) {
      if(Build.VERSION.SDK_INT<33)receive(g,characteristic.getValue());
    }
    @Override public void onCharacteristicChanged(BluetoothGatt g,BluetoothGattCharacteristic characteristic,byte[] value) {receive(g,value);}
    @Override public void onCharacteristicWrite(BluetoothGatt g,BluetoothGattCharacteristic characteristic,int status) {
      handler.post(()->{
        if(g!=gatt)return;
        current=null;
        if(status!=BluetoothGatt.GATT_SUCCESS){event("error","message","蓝牙连接暂时中断，请靠近时钟后重新连接。");disconnect();return;}
        pump();
      });
    }
  };
  void receive(BluetoothGatt g,byte[] bytes) {
    byte[] copy=bytes.clone();
    handler.post(()->{
      if(g!=gatt)return;
      for(byte value:copy) {
        if(value==10) {event("line","line",new String(incoming.toByteArray(),StandardCharsets.UTF_8));incoming.reset();}
        else if(value!=13) {if(incoming.size()>2048){incoming.reset();event("error","message","设备消息过长。");}else incoming.write(value);}
      }
    });
  }
  void send(String line) {
    if(!ready){event("error","message","尚未连接时钟。");return;}
    if(line.length()>380 || line.indexOf('\n')>=0 || line.indexOf('\r')>=0)return;
    byte[] bytes=(line+"\n").getBytes(StandardCharsets.US_ASCII);
    for(int i=0;i<bytes.length;i+=20)pending.addLast(new Tx(commands,Arrays.copyOfRange(bytes,i,Math.min(bytes.length,i+20))));
    pump();
  }
  void pump() {
    if(!ready || gatt==null || current!=null || pending.isEmpty())return;
    current=pending.removeFirst();Tx sent=current;boolean queued;
    if(Build.VERSION.SDK_INT>=33)queued=gatt.writeCharacteristic(sent.characteristic,sent.bytes,BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT)==BluetoothStatusCodes.SUCCESS;
    else {sent.characteristic.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);sent.characteristic.setValue(sent.bytes);queued=gatt.writeCharacteristic(sent.characteristic);}
    if(!queued){current=null;event("error","message","蓝牙正忙，请重新连接。");disconnect();return;}
    int token=generation;handler.postDelayed(()->{if(token==generation && current==sent){event("error","message","蓝牙写入超时。");disconnect();}},8000);
  }
  void stop() {
    cancelOtaRecovery();
    pending.clear();
    if(ready && stopChar!=null){pending.addFirst(new Tx(stopChar,new byte[]{1}));pump();}
  }
  void reconnect() {
    if(!permissions())return;
    String address=getPreferences(MODE_PRIVATE).getString("lastDevice","");
    if(adapter==null||address.isEmpty()){event("error","message","没有上次连接记录，请先扫描。");return;}
    if(!adapter.isEnabled()){startActivityForResult(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE),8);return;}
    try {devices.put(address,adapter.getRemoteDevice(address));connect(address);}
    catch(Exception exception){event("error","message",exception.toString());}
  }
  // Text is shaped with the phone's fonts; only small geometric contours go to ESP32.
  String textPaths(String text) {
    JSONObject result=new JSONObject();
    try {
      text=text.trim();
      if(text.isEmpty()||text.codePointCount(0,text.length())>16)throw new Exception("请输入1–16个字符，复杂中文建议不超过4字。");
      Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);paint.setTextSize(100);
      for(int i=0;i<text.length();){int c=text.codePointAt(i);String glyph=new String(Character.toChars(c));if(!Character.isWhitespace(c)&&!paint.hasGlyph(glyph))throw new Exception("手机字体不支持字符："+glyph);i+=Character.charCount(c);}
      Path path=new Path();paint.getTextPath(text,0,text.length(),0,0,path);
      RectF bounds=new RectF();path.computeBounds(bounds,true);
      if(bounds.width()<=0||bounds.height()<=0)throw new Exception("这段文字没有可绘制轮廓。");
      float scale=Math.min(60f/bounds.width(),22f/bounds.height());
      // Rasterize at a fixed physical resolution, then reduce filled strokes to centerlines.
      // Geometry stays single-pass; actual line width is set by the UV light spot.
      final float pixelsPerMm=10f;
      int width=(int)Math.ceil(bounds.width()*scale*pixelsPerMm)+8;
      int height=(int)Math.ceil(bounds.height()*scale*pixelsPerMm)+8;
      android.graphics.Bitmap bitmap=android.graphics.Bitmap.createBitmap(width,height,android.graphics.Bitmap.Config.ARGB_8888);
      boolean[] mask=new boolean[width*height];
      try{
        android.graphics.Canvas canvas=new android.graphics.Canvas(bitmap);
        canvas.translate(4,4);canvas.scale(scale*pixelsPerMm,scale*pixelsPerMm);canvas.translate(-bounds.left,-bounds.top);
        paint.setColor(android.graphics.Color.WHITE);paint.setStyle(Paint.Style.FILL);canvas.drawPath(path,paint);
        int[] pixels=new int[mask.length];bitmap.getPixels(pixels,0,width,0,0,width,height);
        for(int i=0;i<pixels.length;i++)mask[i]=(pixels[i]>>>24)>=128;
      }finally{bitmap.recycle();}
      JSONArray contours=new JSONArray();int total=0;
      for(int[] stroke:TextSkeleton.trace(mask,width,height)){
        if(contours.length()>=400||(total+=stroke.length)>18000)throw new Exception("文字过于复杂，请减少字数或分开绘制。");
        JSONArray contour=new JSONArray();
        for(int i=0;i<stroke.length;i++){
          double px=(stroke[i]%width-4)/pixelsPerMm,py=(stroke[i]/width-4)/pixelsPerMm;
          // An isolated dot gets one 0.2 mm exposure segment, never a box.
          if(stroke.length==2&&stroke[0]==stroke[1])px+=(i==0?-.1:.1);
          JSONObject coordinate=new JSONObject();coordinate.put("x",39+px-bounds.width()*scale/2);coordinate.put("y",22.5-py+bounds.height()*scale/2);contour.put(coordinate);
        }
        if(contour.length()>1)contours.put(contour);
      }
      if(contours.length()==0)throw new Exception("文字过小，无法生成单线笔画，请减少字数。");
      result.put("strokes",contours);
    }catch(Exception exception){try{result.put("error",exception.getMessage());}catch(Exception ignored){}}
    return result.toString();
  }
  final class Bridge {
    @JavascriptInterface public void pageReady(){handler.post(()->{if(!destroyed&&uiTransitions!=null)uiTransitions.pageReady();});}
    @JavascriptInterface public void setAppearance(String preference){
      if(!"light".equals(preference)&&!"dark".equals(preference)&&!"system".equals(preference))return;
      handler.post(()->{if(destroyed)return;getPreferences(MODE_PRIVATE).edit().putString("appearance",preference).apply();applyAppearance(preference);});
    }
    @JavascriptInterface public void setAppearanceAnimated(String preference,boolean animated){
      if(!"light".equals(preference)&&!"dark".equals(preference)&&!"system".equals(preference))return;
      handler.post(()->{if(destroyed)return;getPreferences(MODE_PRIVATE).edit().putString("appearance",preference).apply();applyAppearance(preference,animated);});
    }
    @JavascriptInterface public void chooseFirmware(){handler.post(()->ota.choose());}
    @JavascriptInterface public void uploadFirmware(String ip,String token,String session){handler.post(()->{
      if(!ready||gatt==null){event("otaResult","status","error","session",session,"message","请先连接时钟后再升级。");return;}
      endOtaRecovery("ended");otaAddress=gatt.getDevice().getAddress();otaSession=session;otaTransferActive=true;ota.allBytesSent=false;ota.upload(ip,token,session);
    });}
    @JavascriptInterface public void recoverAfterOta(){handler.post(()->beginOtaRecovery());}
    @JavascriptInterface public void finishOtaRecovery(){handler.post(()->endOtaRecovery("ended"));}
    @JavascriptInterface public void cancelOtaReconnect(){handler.post(()->cancelOtaRecovery());}
    @JavascriptInterface public void cancelFirmware(){handler.post(()->cancelOtaRecovery());}
    @JavascriptInterface public String textPaths(String text){return MainActivity.this.textPaths(text);}
    @JavascriptInterface public void reconnect(){handler.post(()->{cancelOtaRecovery();MainActivity.this.reconnect();});}
    @JavascriptInterface public void scan(){handler.post(()->{cancelOtaRecovery();MainActivity.this.scan();});}
    @JavascriptInterface public void connect(String address){handler.post(()->{cancelOtaRecovery();MainActivity.this.connect(address);});}
    @JavascriptInterface public void disconnect(){handler.post(()->{cancelOtaRecovery();MainActivity.this.disconnect();});}
    @JavascriptInterface public void send(String line){handler.post(()->MainActivity.this.send(line));}
    @JavascriptInterface public void stop(){handler.post(()->MainActivity.this.stop());}
    @JavascriptInterface public String platform(){return "android";}
  }
  @Override protected void onResume(){super.onResume();if(web!=null&&!destroyed)event("appForeground");}
  @Override protected void onDestroy() {
    if(uiTransitions!=null)uiTransitions.close();
    if(appearanceAnimator!=null){appearanceAnimator.cancel();appearanceAnimator=null;}
    if(connectivity!=null&&wifiCallback!=null)try{connectivity.unregisterNetworkCallback(wifiCallback);}catch(Exception ignored){}
    endOtaRecovery("ended");otaTransferActive=false;
    if(ota!=null)ota.close();
    stopScan();disconnect();destroyed=true;handler.removeCallbacksAndMessages(null);
    if(web!=null){web.removeJavascriptInterface("ClockNative");web.destroy();}super.onDestroy();
  }
}
