package cn.jianclock.companion;

import java.net.*;

final class OtaNetworkPolicy {
  static boolean sameSubnet(byte[] a,byte[] b,int prefix){
    if(a==null||b==null||a.length!=4||b.length!=4||prefix<0||prefix>32)return false;
    for(int i=0;i<4;i++){int bits=Math.min(8,Math.max(0,prefix-i*8));int mask=bits==0?0:(255<<(8-bits))&255;if((a[i]&mask)!=(b[i]&mask))return false;}
    return true;
  }
  static String failure(Exception e,boolean complete){
    if(e instanceof OtaImage.ResponseException){
      String code=((OtaImage.ResponseException)e).response;
      if(code.contains("SHA"))return "固件校验未通过，设备没有确认升级成功。请重新选择正确的应用固件后重试。";
      if(code.contains("TOKEN")||code.contains("AUTH"))return "升级授权已失效，请重新点击“开始无线升级”。";
      return "时钟未接受这次固件，请确认选择的是本项目的 ESP32-S3 应用固件，然后重新开始升级。";
    }
    if("NO_WIFI".equals(e.getMessage()))return "手机还没有连接 Wi-Fi。请打开手机 WLAN，连接时钟使用的同一个 Wi-Fi 后再试。";
    if(complete)return "固件已发送，但尚未收到时钟的最终确认。正在等待重启并自动重连，读取版本后再确认结果。";
    return "手机暂时无法连接时钟的升级服务。请确认手机和时钟连接的是同一个 Wi-Fi；可在“网络连接”中查看时钟所连网络。若已连接同一 Wi-Fi，请检查访客网络或设备隔离设置，靠近路由器后重试。";
  }
}
