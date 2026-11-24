#pragma once
#include <cstdint>
namespace upgradelight {
void begin();
unsigned pin();
bool busy();
bool setPin(unsigned next);
void start();
void tick();
}
