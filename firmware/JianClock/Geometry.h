#pragma once
#include <cmath>
#include <cstdint>

// Geometry and calibration recovered from the original ESP32-C3 ELF (millimetres).
namespace clockwork {
constexpr double K_PI = 3.14159265358979323846;
constexpr double HOME_X = 58.0, HOME_Y = -1.0;
constexpr int PULSE_MIN = 500, PULSE_MAX = 2500;
struct Calibration {
  int leftZero = 1730, leftScale = 615, rightZero = 825, rightScale = 590;
  bool valid() const {
    return leftZero >= 500 && leftZero <= 2500 && rightZero >= 500 && rightZero <= 2500 &&
           leftScale >= 200 && leftScale <= 1000 && rightScale >= 200 && rightScale <= 1000;
  }
};
struct Pulses { int left, right; };
// Angle between sides a and c, opposite side b. Reject impossible triangles.
inline bool cosineRule(double a, double b, double c, double &angle) {
  if (!std::isfinite(c) || c <= 0 || c > a+b+1e-6 || c < std::fabs(a-b)-1e-6) return false;
  double v = (a*a+c*c-b*b)/(2*a*c);
  v = v < -1 ? -1 : v > 1 ? 1 : v;
  angle = std::acos(v);
  return true;
}
inline bool solve(double x, double y, const Calibration &cal, Pulses &out) {
  if (!std::isfinite(x) || !std::isfinite(y) || !cal.valid()) return false;
  // Original Gaussian Y compensation; y==25 has a zero denominator in the old binary.
  if (y >= 0 && y < 25) {
    double width = (25-y)*0.8;
    double u = std::fabs(x-56)/width;
    y += std::exp(-u*u)*(30-y)*0.03;
  }
  double dx = x-26.1, dy = y+30.5;
  double distance = std::hypot(dx, dy), theta = std::atan2(dy, dx);
  double a, b, ledAngle, c;
  if (!cosineRule(33.35, 53.85, distance, a) ||
      !cosineRule(53.85, 33.35, distance, b) ||
      !cosineRule(53.85, 45.05, 13.0, ledAngle)) return false;
  double direction = theta-b+ledAngle+K_PI;
  double rx = x-51.1+13.0*std::cos(direction), ry = dy+13.0*std::sin(direction);
  if (!cosineRule(34.85, 45.05, std::hypot(rx, ry), c)) return false;
  double l = std::floor(cal.leftZero+cal.leftScale*(theta+a-K_PI));
  double r = std::floor(cal.rightZero+cal.rightScale*(std::atan2(ry, rx)-c));
  if (!std::isfinite(l) || !std::isfinite(r) || l < PULSE_MIN || l > PULSE_MAX ||
      r < PULSE_MIN || r > PULSE_MAX) return false;
  out = {static_cast<int>(l), static_cast<int>(r)};
  return true;
}
}  // namespace clockwork
