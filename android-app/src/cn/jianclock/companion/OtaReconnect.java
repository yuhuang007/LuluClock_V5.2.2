package cn.jianclock.companion;

/** Bounded recovery for the exact device that received this transfer. */
final class OtaReconnect {
  static final long TIMEOUT_MS=75000;
  String address="";long deadline;int attempts;boolean active;
  boolean begin(String target,long now){
    if(active||target==null||target.isEmpty())return false;
    address=target;deadline=now+TIMEOUT_MS;attempts=0;active=true;return true;
  }
  boolean expired(long now){return active&&now>=deadline;}
  boolean attempt(long now){if(!active||expired(now))return false;attempts++;return true;}
  long delay(){return Math.min(6000,2000+attempts*1000);}
  void stop(){active=false;address="";}
}
