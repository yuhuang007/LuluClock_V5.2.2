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
   | Flash Mode / Flash Size | QIO 80MHz / 16MB (128Mb) |
   | PSRAM | OPI PSRAM |
   | Partition Scheme | 16M Flash (3MB APP/9.9MB FATFS) |
   | USB CDC On Boot | Disabled |
   | USB Mode | Hardware CDC and JTAG |
   | Upload Mode / Upload Speed | UART0 / Hardware CDC；115200 |

4. 点击「验证」先编译，再按[接线和首次上电说明](../hardware/wiring.md#uart0-维护口)准备串口。拔插 USB 串口设备，确认端口列表中新增的是哪一个，再点「上传」。上传完成后按需单按 EN 复位，串口监视器用 115200 波特率，检查启动行是否显示 `JianClock S3 5.2.2`。`GPIO16` 是整机中键；板载 BOOT 是 `GPIO0`。

分区表决定可用应用空间。此配置有两个 3 MiB 应用分区；只选择 16 MB Flash 并不会自动启用它们，默认 4 MB 配置也不适合本项目。Windows 若从 Arduino IDE 编译遇到路径乱码或链接错误，先把工程和构建路径放到只含 ASCII 字符的目录，或用下方 PowerShell 脚本。

## Arduino CLI

从仓库根目录执行。初次用 CLI 时安装同一组核心与库：

```sh
arduino-cli core update-index --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core install esp32:esp32@3.3.12 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli lib install U8g2@2.36.19
```

在 Windows PowerShell 中执行 `./firmware/build.ps1`。脚本默认使用 `PATH` 上的 `arduino-cli`；可用 `-Cli` 和 `-ConfigFile` 指定可执行文件和 Arduino 配置。脚本只编译。默认输出到 `firmware/build/`；若该输出路径含中文等非 ASCII 字符，Windows 脚本会在可用的 ASCII 临时目录内创建本次专用的构建目录。以脚本末尾的 `Build output:` 为准。

若找不到这样的临时目录，或希望产物放在固定位置，可用 `./firmware/build.ps1 -OutputDir 'C:\lulu-build'`（换成自己可写、只含 ASCII 字符的本地路径）。同一个输出目录一次只供一个脚本构建；并行编译请选择不同的 `-OutputDir`。

其他平台可直接编译：

```sh
arduino-cli compile --fqbn 'esp32:esp32:esp32s3:CDCOnBoot=default,USBMode=hwcdc,UploadMode=default,FlashMode=qio,FlashSize=16M,PSRAM=opi,PartitionScheme=app3M_fat9M_16MB,UploadSpeed=115200' --build-path "$PWD/firmware/build" firmware/JianClock
```

### 从 CLI 烧录空板

1. 按 [UART0 接线](../hardware/wiring.md#uart0-维护口) 只接主控与串口。用 `arduino-cli board list` 核对拔插前后新增的端口，关闭占用该端口的串口监视器。使用外接 TTL 时，逻辑电平为 3.3 V，交叉接 TX/RX，接地且不连转接器 VCC。
2. 编译成功后，从仓库根目录执行下面的命令。把 `COM7` 换成实际端口（Linux 例如 `/dev/ttyUSB0`），把构建目录换成实际的 `Build output:` 路径。若编译时使用了 `-ConfigFile`，上传时也向 CLI 传入同一 `--config-file`。

   ```sh
   arduino-cli upload --fqbn 'esp32:esp32:esp32s3:CDCOnBoot=default,USBMode=hwcdc,UploadMode=default,FlashMode=qio,FlashSize=16M,PSRAM=opi,PartitionScheme=app3M_fat9M_16MB,UploadSpeed=115200' --port 'COM7' --input-dir './firmware/build' firmware/JianClock
   ```

3. 没有自动下载电路时，按住 BOOT，短按 EN 后松开 EN，再启动上传，开始连接烧录后松开 BOOT。上传之后如未自动启动，松开 BOOT 后短按 EN，以 115200 波特率查看启动行。装臂前先让灯头断开，并按[首次上电顺序](../hardware/wiring.md#首次上电)逐项验证。

## 选择正确的镜像

| 用途 | 文件及操作 |
| --- | --- |
| 空板首次烧录 / 串口恢复 | 推荐 IDE 上传草图，或 CLI 传入整个构建目录，由工具写入引导、分区、OTA 初始化数据和应用 |
| App 局域网 OTA | 现有兼容的 S3 设备从 App 只选择 `JianClock.ino.bin`，更新后重新连接并查看实际版本 |

使用独立串口工具时，以同一次编译输出的 `flash_args` 为准。此板型与分区下，单件镜像的偏移是 `JianClock.ino.bootloader.bin` → `0x0`、`JianClock.ino.partitions.bin` → `0x8000`、`boot_app0.bin` → `0xE000`、`JianClock.ino.bin` → `0x10000`；整合镜像 `JianClock.ino.merged.bin` 则单独从 `0x0` 烧录。先辨认整合镜像和分文件，不能混用。IDE 菜单选择 `QIO 80MHz` 时，这版工具链产生的 `flash_args` 使用 `dio` 头部参数，按生成的参数使用。

公开版 APK 不内置固件。手动 OTA 只接受应用镜像，不能选整合镜像、引导、分区或初始化文件。OTA 用蓝牙准备、Wi-Fi 局域网传输，升级期间保持连接与稳定供电；空板没有可接收 OTA 的应用，须先经过串口烧录。

## 开发入口

| 想改什么 | 从这里开始 |
| --- | --- |
| 引脚映射、屏幕方向、局部时序 | [Config.h](JianClock/Config.h) |
| 机械臂几何、轨迹生成及运动规划 | [Geometry.h](JianClock/Geometry.h)、[Drawing.cpp](JianClock/Drawing.cpp)、[MotionExecutor.h](JianClock/MotionExecutor.h) |
| 蓝牙、整机状态与任务调度 | [BleLink.cpp](JianClock/BleLink.cpp)、[Firmware.cpp](JianClock/Firmware.cpp) |
| OLED、日常设置与光敏 | [Board.cpp](JianClock/Board.cpp)、[DailyPolicy.h](JianClock/DailyPolicy.h) |
| 版本与镜像描述 | [Version.h](JianClock/Version.h)、[AppDescription.cpp](JianClock/AppDescription.cpp) |

早期 C3 工程是为兼容原机构而做的重实现。S3 沿用了基于此前固件行为整理的几何、校准和绘时坐标，来源标注保留在 `Geometry.h` 和 `Strokes.h` 中。这里不分发早期固件的 ELF、映射文件或分析材料。

本公开目录已使用上述核心和库版本做干净编译，核对了应用镜像、分区和 `flash_args`；未连接串口或刷写设备。实际启动、供电、安装、校准和显影需在复刻设备上验证。
