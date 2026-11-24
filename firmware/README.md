# ESP32-S3 固件

当前草图：[JianClock/JianClock.ino](JianClock/JianClock.ino)，固件版本 **5.2.2**。目标是 **ESP32-S3 N16R8**（16 MB Flash、8 MB OPI PSRAM）。这里的引脚和分区配置用于 S3；早期 ESP32-C3 的固件和接线不同。

## Arduino IDE

1. 在 Arduino IDE 的「附加开发板管理器网址」加入：

   ```text
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```

2. 在开发板管理器安装 **esp32 by Espressif Systems 3.3.12**，在库管理器安装 **U8g2 2.36.19**。其他固件依赖由 ESP32 核心提供。
3. 打开 `firmware/JianClock/JianClock.ino`。保留同目录的 `.h`、`.cpp` 和 `.inc` 文件。选择 **ESP32S3 Dev Module**，以下选项对应本项目的已验证配置：

   | 菜单 | 选项 |
   | --- | --- |
   | Flash Mode / Flash Size | QIO / 16 MB |
   | PSRAM | OPI PSRAM |
   | Partition Scheme | 16M Flash (3MB APP/9.9MB FATFS) |
   | USB CDC On Boot | Disabled |
   | USB Mode | Hardware CDC and JTAG |
   | Upload Mode / Upload Speed | UART0 / Hardware CDC；115200 |

4. 点击「验证」先编译，再按[接线和首次上电说明](../hardware/wiring.md)准备硬件和串口，选对端口后才点「上传」。上传完成后按需单按 EN 复位，串口监视器使用 115200 波特率。`GPIO16` 负责整机中键；板载 BOOT 是 `GPIO0`。

分区表决定可用应用空间。只选择 16 MB Flash 并不会自动启用双应用分区，默认 4 MB 配置也不适合本项目。

## Arduino CLI

从仓库根目录执行。初次用 CLI 时安装同一组核心与库：

```sh
arduino-cli core update-index --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core install esp32:esp32@3.3.12 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli lib install U8g2@2.36.19
```

在 Windows PowerShell 中执行 `./firmware/build.ps1`。脚本默认使用 `PATH` 上的 `arduino-cli`，可用 `-Cli`、`-ConfigFile` 和 `-OutputDir` 覆盖路径。它仅编译，产物默认写到 `firmware/build/`。

其他平台可直接编译：

```sh
arduino-cli compile --fqbn 'esp32:esp32:esp32s3:CDCOnBoot=default,USBMode=hwcdc,UploadMode=default,FlashMode=qio,FlashSize=16M,PSRAM=opi,PartitionScheme=app3M_fat9M_16MB,UploadSpeed=115200' --build-path "$PWD/firmware/build" firmware/JianClock
```

## 选择正确的镜像

| 用途 | 文件及操作 |
| --- | --- |
| 空板首次烧录 / 串口恢复 | 推荐 Arduino IDE 上传草图，由工具处理引导、分区和应用 |
| App 局域网 OTA | 现有兼容的 S3 设备从 App 选择 `JianClock.ino.bin`，更新后重新连接并查看实际版本 |

`*.merged.bin`、`*.bootloader.bin`、`*.partitions.bin` 用于串口烧录流程，不能当作 App OTA 应用镜像。从串口升级时，按所用工具的整包或分文件说明操作。OTA 使用蓝牙准备、Wi-Fi 局域网传输；在发送前保持设备供电稳定。

## 开发入口

| 想改什么 | 从这里开始 |
| --- | --- |
| 引脚映射、屏幕方向、局部时序 | [Config.h](JianClock/Config.h) |
| 机械臂几何、轨迹生成及运动规划 | [Geometry.h](JianClock/Geometry.h)、[Drawing.cpp](JianClock/Drawing.cpp)、[MotionExecutor.h](JianClock/MotionExecutor.h) |
| 蓝牙、整机状态与任务调度 | [BleLink.cpp](JianClock/BleLink.cpp)、[Firmware.cpp](JianClock/Firmware.cpp) |
| OLED、日常设置与光敏 | [Board.cpp](JianClock/Board.cpp)、[DailyPolicy.h](JianClock/DailyPolicy.h) |
| 版本与镜像描述 | [Version.h](JianClock/Version.h)、[AppDescription.cpp](JianClock/AppDescription.cpp) |

早期 C3 工程是为兼容原机构而做的重实现。S3 沿用了基于此前固件行为整理的几何、校准和绘时坐标，来源标注保留在 `Geometry.h` 和 `Strokes.h` 中。这里不分发早期固件的 ELF、映射文件或分析材料。

本公开目录已使用上述核心和库版本做干净编译，未连接串口或刷写设备。编译保证依赖及板型配置可用；供电、安装、校准和显影效果仍需在复刻设备上验证。
