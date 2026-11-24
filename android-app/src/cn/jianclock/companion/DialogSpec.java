package cn.jianclock.companion;

/** Dialog intent comes from WebChromeClient's callback, never the result subtype.
 * Chromium may pass a JsPromptResult to onJsConfirm/onJsAlert as well. */
final class DialogSpec {
  enum Kind { ALERT, CONFIRM, PROMPT }
  final boolean input,showCancel;
  final String title,body,positive,negative;
  DialogSpec(Kind kind,String message){
    if(kind==null)throw new IllegalArgumentException("Dialog kind is required");
    input=kind==Kind.PROMPT;showCancel=kind!=Kind.ALERT;
    boolean disconnect=kind==Kind.CONFIRM&&message.startsWith("断开蓝牙");
    boolean deletion=kind==Kind.CONFIRM&&message.startsWith("删除");
    boolean installation=kind==Kind.CONFIRM&&message.startsWith("进入A位");
    title=input?"给图案起个名字":disconnect?"断开蓝牙连接？":deletion?"确认删除":installation?"准备移动机械臂":kind==Kind.ALERT?"小噜提醒":"请确认";
    body=disconnect?"正在绘制的手机图案会停止。\n已经启动的倒计时会继续运行。":message;
    positive=input?"保存":disconnect?"断开连接":deletion?"删除":installation?"开始移动":kind==Kind.ALERT?"知道了":"确定";
    negative=disconnect?"保持连接":"取消";
  }
}
