#pragma once
#include <Arduino.h>
namespace wifiscan {
bool busy();
bool start();
void tick();
void cancel();
String info(long id,unsigned index=0);
}
