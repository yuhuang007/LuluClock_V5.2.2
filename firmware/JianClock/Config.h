#pragma once
#include <cstdint>
namespace config {
// Front view, confirmed by the user's labelled assembled hardware photo.
// Both installation poses and drawing must use this same physical mapping.
constexpr uint8_t LEFT_SERVO = 5, RIGHT_SERVO = 4;
constexpr uint8_t BUTTON = 16, DRAW_LED = 6, BUZZER = 7;
constexpr uint8_t LIGHT_DO = 8, OLED_SDA = 9, OLED_SCL = 10, STRIP = 11;
constexpr uint8_t LEFT_BUTTON = 15, RIGHT_BUTTON = 17, DHT_PIN = 18;
// The fitted SSD1306 module is mounted upside down. Rotate in the controller,
// because Board.cpp transmits U8g2's framebuffer directly in bounded chunks.
constexpr bool OLED_ROTATE_180 = true;
// Weak pull-up supports open-collector DO modules and avoids a floating input.
// It cannot override a real LOW or determine the module's light/dark polarity.
constexpr bool LIGHT_DO_PULLUP = true;
// No ordinary GPIO status LED is confirmed. Keep the old C3 GPIO8 for DO.
constexpr int STATUS_LED = -1;
// User confirmed the on-board WS2812 data pin is GPIO48.
constexpr uint8_t UPGRADE_RGB_PIN = 48, UPGRADE_RGB_BRIGHTNESS = 12;
constexpr unsigned SERVO_BITS = 14, SERVO_HZ = 50;
constexpr unsigned SERVO_MAX_DUTY = (1U << SERVO_BITS) - 1;
constexpr unsigned SERVO_PERIOD_US = 1000000 / SERVO_HZ;
constexpr uint8_t LEFT_PWM_CHANNEL = 0, RIGHT_PWM_CHANNEL = 1;
// Drawing exposure uses timer3; buzzer channel4 is on timer2, servos on timer0.
constexpr uint8_t DRAW_PWM_CHANNEL = 6;
constexpr unsigned DRAW_PWM_HZ = 20000, DRAW_PWM_BITS = 8;
// Channel4 uses a different LEDC timer from servo channels0/1.
// User explicitly requested direct-output hardware testing on 2026-11-15.
// Enabled means permission to switch, NOT verified current or safe wiring.
constexpr bool DRAW_LED_DRIVE_ENABLED = true;
constexpr bool STRIP_OUTPUT_ENABLED = true;
constexpr uint32_t OLED_I2C_HZ = 400000;
constexpr unsigned OLED_TIMEOUT_MS = 6, OLED_MOTION_TIMEOUT_MS = 2;
constexpr unsigned STEP_LIT_MS = 4, STEP_DARK_MS = 2;
constexpr double STEPS_PER_MM = 5;
constexpr unsigned DEBOUNCE_MS = 25, DOUBLE_CLICK_MS = 300, LONG_PRESS_MS = 1100;
constexpr unsigned INSTALL_WINDOW_MS = 2500;
// Set true for a build that always boots into arm installation mode.
constexpr bool START_IN_INSTALL_MODE = false;
constexpr unsigned MAX_UPLOAD_POINTS = 2048;
constexpr long UTC_OFFSET = 8 * 3600; // China Standard Time, no daylight saving.
constexpr const char *NTP_1 = "ntp.aliyun.com", *NTP_2 = "pool.ntp.org", *NTP_3 = "time.nist.gov";
constexpr unsigned CONNECT_TIMEOUT_MS = 15000, SYNC_TIMEOUT_MS = 20000;
constexpr unsigned RESYNC_INTERVAL_MS = 6UL * 3600 * 1000;
}
