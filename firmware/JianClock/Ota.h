#pragma once
#include <Arduino.h>
namespace ota {
bool active();
bool receiving();
const char *open(size_t bytes,const char *sha,const char *ssid,const char *password);
void cancel();
void tick();
String info(long id,bool includeSecret=false);
unsigned progress();
unsigned displayStage(); // 0 off, 1 connect, 2 ready, 3 receive, 4 check, 5 reboot, 6 fail, 7 cancel
// True once, only when a pending OTA image is confirmed successfully.
bool healthyBoot(bool ready);
}
