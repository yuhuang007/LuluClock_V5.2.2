#pragma once
#include <Arduino.h>
namespace blelink {
constexpr const char *SERVICE="f0c10001-67a4-4435-b5d3-9d10d7e328a1";
constexpr const char *COMMAND="f0c10002-67a4-4435-b5d3-9d10d7e328a1";
constexpr const char *EVENT="f0c10003-67a4-4435-b5d3-9d10d7e328a1";
constexpr const char *STOP="f0c10004-67a4-4435-b5d3-9d10d7e328a1";
constexpr size_t MAX_LINE=640;
bool begin();
void tick();
bool connected();
const char *deviceCode();
bool interrupted(bool includeDisconnect=true);
bool takeStop();
bool takeDisconnect();
bool receive(char *line);
void send(const String &line);
}
