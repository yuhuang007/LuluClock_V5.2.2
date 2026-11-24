package cn.jianclock.companion;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.net.HttpURLConnection;
import java.util.concurrent.atomic.AtomicBoolean;

// Platform-independent validation and raw transfer; exercised with a local server.
final class OtaImage {
  static final int MAX=3*1024*1024;
  final byte[] bytes;final String sha,version;
  OtaImage(byte[] data) throws Exception {
    if(data.length<288||data.length>MAX)throw new IOException("请选择不超过3MB的应用固件.bin，不能用merged合并文件。");
    if((data[0]&255)!=0xe9||(data[12]&255)!=9||data[13]!=0||
      (data[32]&255)!=0x32||(data[33]&255)!=0x54||(data[34]&255)!=0xcd||(data[35]&255)!=0xab||
      !new String(data,80,10,StandardCharsets.US_ASCII).equals("JianClock\0"))
      throw new IOException("文件不是本项目的ESP32-S3应用固件，请选JianClock.ino.bin或标注OTA的应用文件。");
    int end=48;while(end<80&&data[end]!=0)++end;version=new String(data,48,end-48,StandardCharsets.US_ASCII);
    bytes=data;StringBuilder out=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(data))out.append(String.format(java.util.Locale.ROOT,"%02x",b&255));sha=out.toString();
  }
  static OtaImage read(InputStream input) throws Exception {
    ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] block=new byte[8192];int n;
    while((n=input.read(block))!=-1){if(out.size()+n>MAX)throw new IOException("文件超过3MB；OTA不能使用完整合并固件。");out.write(block,0,n);}
    return new OtaImage(out.toByteArray());
  }
  static boolean privateIp(String ip){
    if(ip==null||!ip.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}"))return false;
    String[] parts=ip.split("\\.");int[] n=new int[4];for(int i=0;i<4;i++){if(parts[i].length()>1&&parts[i].startsWith("0"))return false;n[i]=Integer.parseInt(parts[i]);if(n[i]>255)return false;}
    return n[0]==10||(n[0]==172&&n[1]>=16&&n[1]<=31)||(n[0]==192&&n[1]==168)||(n[0]==169&&n[1]==254);
  }
  static final class ResponseException extends IOException {
    final String response;
    ResponseException(int status,String body){super("设备未确认升级：HTTP "+status+" "+body);response=body;}
  }
  interface Progress{void bytes(int sent,int total);}
  void upload(HttpURLConnection connection,String token,AtomicBoolean cancel,Progress progress) throws Exception {
    if(token==null||!token.matches("[0-9a-f]{32}"))throw new IOException("升级授权无效，请重新开启OTA。");
    connection.setInstanceFollowRedirects(false);connection.setRequestMethod("POST");connection.setDoOutput(true);
    connection.setConnectTimeout(8000);connection.setReadTimeout(15000);
    connection.setRequestProperty("Content-Type","application/octet-stream");connection.setRequestProperty("Authorization","Bearer "+token);
    connection.setFixedLengthStreamingMode(bytes.length);
    try(OutputStream stream=connection.getOutputStream()){
      for(int offset=0;offset<bytes.length;offset+=8192){if(cancel.get())throw new InterruptedIOException("已取消升级");int n=Math.min(8192,bytes.length-offset);stream.write(bytes,offset,n);progress.bytes(offset+n,bytes.length);}
    }
    if(cancel.get())throw new InterruptedIOException("已取消升级");
    int status=connection.getResponseCode();InputStream response=status==200?connection.getInputStream():connection.getErrorStream();
    ByteArrayOutputStream reply=new ByteArrayOutputStream();if(response!=null)try(InputStream stream=response){int c;while(reply.size()<256&&(c=stream.read())!=-1)reply.write(c);}
    String body=new String(reply.toByteArray(),StandardCharsets.UTF_8).trim();
    if(status!=200||!body.equals("OTA_OK_REBOOT"))throw new ResponseException(status,body);
  }
}
