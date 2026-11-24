package cn.jianclock.companion;

import android.app.Activity;
import android.content.*;
import android.database.Cursor;
import android.net.*;
import android.provider.OpenableColumns;
import java.io.*;
import java.net.*;
import java.util.concurrent.atomic.AtomicBoolean;

final class OtaManager {
  static final int PICK=41;
  interface Events{void emit(String type,String... values);}
  final Activity activity;final Events events;
  final AtomicBoolean busy=new AtomicBoolean(),cancelled=new AtomicBoolean();
  volatile boolean allBytesSent=false;
  volatile HttpURLConnection connection;volatile OtaImage selected;volatile boolean closed=false;
  OtaManager(Activity a,Events e){activity=a;events=e;}
  void emit(String type,String... values){if(!closed)events.emit(type,values);}
  void choose(){
    if(busy.get())return;
    selected=null;
    Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.setType("*/*");intent.addCategory(Intent.CATEGORY_OPENABLE);
    try{activity.startActivityForResult(intent,PICK);}catch(Exception e){emit("otaFile","error","无法打开文件选择器："+e.getMessage());}
  }
  void result(int code,Intent data){
    if(code!=Activity.RESULT_OK||data==null||data.getData()==null){emit("otaFile","cancelled","1");return;}
    final Uri uri=data.getData();
    if(!busy.compareAndSet(false,true))return;
    new Thread(()->{
      try{
        String name="应用固件.bin";
        try(Cursor cursor=activity.getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(cursor!=null&&cursor.moveToFirst())name=cursor.getString(0);}
        if(name==null||!name.toLowerCase(java.util.Locale.ROOT).endsWith(".bin"))throw new IOException("请选择.bin应用固件。");
        OtaImage image;try(InputStream input=activity.getContentResolver().openInputStream(uri)){if(input==null)throw new IOException("无法读取文件");image=OtaImage.read(input);}
        selected=image;emit("otaFile","source","manual","version",image.version,"name",name,"size",String.valueOf(image.bytes.length),"sha",image.sha);
      }catch(Exception e){selected=null;emit("otaFile","error",e.getMessage()==null?e.toString():e.getMessage());}
      finally{busy.set(false);}
    },"OTA-file-check").start();
  }
  void uploadEvent(String session,String type,String... pairs){
    String[] values=java.util.Arrays.copyOf(pairs,pairs.length+2);values[pairs.length]="session";values[pairs.length+1]=session;emit(type,values);
  }
  void upload(String ip,String token,String session){
    final OtaImage image=selected;
    if(image==null||!OtaImage.privateIp(ip)){uploadEvent(session,"otaResult","status","error","message","请先选择应用固件，并确认时钟与手机在同一 Wi-Fi 局域网。");return;}
    if(!busy.compareAndSet(false,true)){uploadEvent(session,"otaResult","status","error","message","上一次文件或传输任务还未结束，请稍后重试。");return;}cancelled.set(false);allBytesSent=false;
    new Thread(()->{
      HttpURLConnection conn=null;
      try{
        ConnectivityManager cm=(ConnectivityManager)activity.getSystemService(Context.CONNECTIVITY_SERVICE);Network wifi=null;
        for(Network network:cm.getAllNetworks()){NetworkCapabilities cap=cm.getNetworkCapabilities(network);if(cap!=null&&cap.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)){wifi=network;break;}}
        if(wifi==null)throw new IOException("NO_WIFI");
        LinkProperties links=cm.getLinkProperties(wifi);boolean hasV4=false,local=false;String phoneIp="";
        byte[] target=InetAddress.getByName(ip).getAddress();
        if(links!=null)for(LinkAddress address:links.getLinkAddresses())if(address.getAddress() instanceof Inet4Address){
          hasV4=true;phoneIp=address.getAddress().getHostAddress();
          local|=OtaNetworkPolicy.sameSubnet(address.getAddress().getAddress(),target,address.getPrefixLength());
        }
        if(hasV4&&!local)uploadEvent(session,"otaNetwork","message","手机与时钟的网络地址不在同一网段，请确认是否连接同一个 Wi-Fi。正在尝试连接；如果无法连接，请到“网络连接”检查时钟的 Wi-Fi。","phoneIp",phoneIp,"clockIp",ip);
        // Different subnets can still be routed. Warn, then test the actual connection.

        conn=(HttpURLConnection)wifi.openConnection(new URL("http://"+ip+":3232/update"));connection=conn;
        final long[] last={0};
        image.upload(conn,token,cancelled,(sent,total)->{long now=android.os.SystemClock.elapsedRealtime();if(now-last[0]>250||sent==total){last[0]=now;allBytesSent=sent==total;uploadEvent(session,"otaProgress","pct",String.valueOf(Math.min(99,(long)sent*100/total)),"complete",allBytesSent?"1":"0");}});
        uploadEvent(session,"otaResult","status","accepted","message","时钟已接受固件，正在重启。App 将自动重连并确认固件版本。");
      }catch(Exception e){
        android.util.Log.w("LuluOTA","Transfer ended: "+e.getClass().getSimpleName());
        boolean uncertain=allBytesSent&&!(e instanceof OtaImage.ResponseException);
        uploadEvent(session,"otaResult","status",cancelled.get()?"cancelled":uncertain?"uncertain":"error","message",cancelled.get()?"升级已取消":OtaNetworkPolicy.failure(e,allBytesSent));
      }
      finally{if(conn!=null)conn.disconnect();connection=null;busy.set(false);}
    },"OTA-WiFi-upload").start();
  }
  void cancel(){cancelled.set(true);HttpURLConnection conn=connection;if(conn!=null)conn.disconnect();}
  void close(){closed=true;cancel();selected=null;}
}
