#pragma once
#include <vector>
#include <cstdint>
#include "Geometry.h"
namespace clockwork {
struct Point { float x, y; uint16_t dwell; bool lit; };
using Path = std::vector<Point>;
void glyph(Path &path, bool digit, unsigned id, float x, float y, float width, float height);
Path timePath(int hour, int minute);
Path datePath(int month, int day, int weekday);
Path wifiPath();
Path patternPath(unsigned pattern);
bool validatePath(const Path &path, double startX, double startY, const Calibration &cal, bool (*proceed)()=nullptr);
}
