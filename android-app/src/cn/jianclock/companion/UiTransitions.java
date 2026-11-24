package cn.jianclock.companion;

import android.app.Activity;
import android.os.Handler;
import android.view.Gravity;
import android.view.View;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;

/** Owns short-lived composited overlays. No device, networking or OTA behavior. */
final class UiTransitions {
  final Activity activity;
  final WebView web;
  final FrameLayout root;
  final Handler handler;
  FrameLayout bootShell;
  boolean closed=false, bootReady=false;

  UiTransitions(Activity activity, WebView web, FrameLayout root, Handler handler, int background) {
    this.activity=activity;this.web=web;this.root=root;this.handler=handler;
    ImageView icon=new ImageView(activity);
    icon.setImageResource(R.drawable.brand_launch);
    icon.setScaleType(ImageView.ScaleType.FIT_CENTER);
    bootShell=new FrameLayout(activity);bootShell.setBackgroundColor(background);
    int size=Math.round(112*activity.getResources().getDisplayMetrics().density);
    bootShell.addView(icon,new FrameLayout.LayoutParams(size,size,Gravity.CENTER));
    bootShell.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
    root.addView(bootShell,new FrameLayout.LayoutParams(-1,-1));
  }
  void pageReady() {
    if(closed||bootReady)return;bootReady=true;
    web.postVisualStateCallback(0,new WebView.VisualStateCallback(){
      @Override public void onComplete(long id){
        if(closed)return;
        // Native icon -> already painted HTML cover; app is still concealed.
        if(bootShell!=null){root.removeView(bootShell);bootShell=null;}
        web.evaluateJavascript("window.startupReady418&&window.startupReady418()",null);
      }
    });
  }
  void close(){closed=true;if(bootShell!=null){root.removeView(bootShell);bootShell=null;}}
}
