package cn.jianclock.companion;

import android.app.Activity;
import android.app.Dialog;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.content.res.ColorStateList;
import android.view.Gravity;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.webkit.JsResult;
import android.webkit.JsPromptResult;
import android.widget.*;

/** Resolve WebView's synchronous JS dialogs through a branded native surface.
 * Keeping JsResult preserves all existing confirm/prompt cancellation semantics. */
final class BrandDialogs {
  private final Activity host;
  private Dialog active;
  BrandDialogs(Activity activity){host=activity;}
  private int dp(float v){return Math.round(v*host.getResources().getDisplayMetrics().density);}
  private GradientDrawable shape(int color,int radius,int border){
    GradientDrawable bg=new GradientDrawable();bg.setColor(color);bg.setCornerRadius(dp(radius));
    if(border!=0)bg.setStroke(dp(1),border);return bg;
  }
  void cancel(){if(active!=null){active.cancel();active=null;}}
  private TextView text(String value,int size,int color,boolean bold){
    TextView t=new TextView(host);t.setText(value);t.setTextSize(size);t.setTextColor(color);
    if(bold)t.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));
    t.setLineSpacing(dp(3),1);return t;
  }
  private TextView button(String label,int background,int foreground){
    TextView v=text(label,15,foreground,true);v.setGravity(Gravity.CENTER);v.setMinHeight(dp(50));
    v.setPadding(dp(10),dp(10),dp(10),dp(10));v.setFocusable(true);v.setClickable(true);
    v.setBackground(new RippleDrawable(ColorStateList.valueOf(0x22ffffff),shape(background,17,0),null));
    v.setAccessibilityDelegate(new android.view.View.AccessibilityDelegate(){
      @Override public void onInitializeAccessibilityNodeInfo(android.view.View view,android.view.accessibility.AccessibilityNodeInfo info){
        super.onInitializeAccessibilityNodeInfo(view,info);info.setClassName("android.widget.Button");
      }
    });return v;
  }
  boolean show(String message,String initial,JsResult result,DialogSpec.Kind kind){
    if(host.isFinishing()||host.isDestroyed()){result.cancel();return true;}
    cancel();
    String mode=host.getPreferences(Activity.MODE_PRIVATE).getString("appearance","system");
    boolean dark="dark".equals(mode)||("system".equals(mode)&&
      (host.getResources().getConfiguration().uiMode&Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES);
    int ink=dark?0xfff3ecdf:0xff292f26,muted=dark?0xffb5b8ac:0xff6c7265;
    int surface=dark?0xff242821:0xfffffcf5,soft=dark?0xff343a30:0xffeeeee3;
    int accent=dark?0xffffbd7a:0xffa65022;
    DialogSpec spec=new DialogSpec(kind,message);
    Dialog dialog=new Dialog(host);active=dialog;dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
    boolean[] settled={false};
    Runnable cancel=()->{if(!settled[0]){settled[0]=true;result.cancel();}};
    dialog.setOnCancelListener(d->cancel.run());
    dialog.setOnDismissListener(d->{cancel.run();if(active==dialog)active=null;});
    LinearLayout card=new LinearLayout(host);card.setOrientation(LinearLayout.VERTICAL);
    card.setPadding(dp(24),dp(25),dp(24),dp(22));card.setBackground(shape(surface,28,dark?0xff42483b:0xffe4e5d8));
    TextView brand=text("噜噜绘时钟  ·  LITTLE MOMENTS",10,accent,true);brand.setLetterSpacing(.08f);card.addView(brand);
    TextView heading=text(spec.title,23,ink,true);LinearLayout.LayoutParams headingLp=new LinearLayout.LayoutParams(-1,-2);headingLp.topMargin=dp(15);card.addView(heading,headingLp);
    TextView detail=text(spec.body,15,muted,false);LinearLayout.LayoutParams detailLp=new LinearLayout.LayoutParams(-1,-2);detailLp.topMargin=dp(12);card.addView(detail,detailLp);
    EditText input=spec.input?new EditText(host):null;
    if(input!=null){
      input.setSingleLine(true);input.setTextColor(ink);input.setTextSize(16);input.setSelectAllOnFocus(true);
      input.setContentDescription(message);input.setText(initial==null?"":initial);
      input.setPadding(dp(14),dp(12),dp(14),dp(12));input.setBackground(shape(soft,15,0));
      input.setImeOptions(EditorInfo.IME_ACTION_DONE);input.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(24)});
      LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.topMargin=dp(18);card.addView(input,lp);
    }
    Runnable accept=()->{
      if(settled[0])return;
      if(input!=null&&input.getText().toString().trim().isEmpty()){input.setError("请输入图案名称");return;}
      settled[0]=true;
      if(input!=null)((JsPromptResult)result).confirm(input.getText().toString().trim());else result.confirm();
      dialog.dismiss();
    };
    LinearLayout actions=new LinearLayout(host);actions.setOrientation(LinearLayout.HORIZONTAL);
    LinearLayout.LayoutParams actionsLp=new LinearLayout.LayoutParams(-1,-2);actionsLp.topMargin=dp(24);card.addView(actions,actionsLp);
    if(spec.showCancel){TextView no=button(spec.negative,soft,ink);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.setMarginEnd(dp(10));actions.addView(no,lp);no.setOnClickListener(v->dialog.cancel());}
    TextView yes=button(spec.positive,dark?0xffe9b37e:0xffb46032,dark?0xff30271e:Color.WHITE);
    actions.addView(yes,new LinearLayout.LayoutParams(0,-2,1));yes.setOnClickListener(v->accept.run());
    if(input!=null)input.setOnEditorActionListener((v,action,event)->{if(action==EditorInfo.IME_ACTION_DONE){accept.run();return true;}return false;});
    ScrollView scroll=new ScrollView(host);scroll.setFillViewport(false);scroll.addView(card);scroll.setBackground(shape(surface,28,0));scroll.setClipToOutline(true);
    dialog.setContentView(scroll);dialog.setCanceledOnTouchOutside(true);
    Window window=dialog.getWindow();window.setBackgroundDrawableResource(android.R.color.transparent);
    window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);window.setDimAmount(dark?.48f:.24f);
    window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    dialog.show();
    int available=host.getResources().getDisplayMetrics().widthPixels-dp(40);
    window.setLayout(Math.min(dp(390),available),WindowManager.LayoutParams.WRAP_CONTENT);
    card.setAlpha(0);card.setScaleX(.94f);card.setScaleY(.94f);card.setTranslationY(dp(12));
    card.animate().alpha(1).scaleX(1).scaleY(1).translationY(0).setDuration(240).setInterpolator(new android.view.animation.PathInterpolator(.2f,.85f,.2f,1f)).start();
    if(input!=null){input.requestFocus();window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE|WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE);}
    return true;
  }
}
