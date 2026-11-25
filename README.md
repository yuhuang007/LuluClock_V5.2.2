<div align="center">

# 噜噜绘时钟 · LuluClock V5.2.2

**一台会用光画画的桌面时钟。**

两只舵机带动灯头，在蓄光板上写下时间、汉字和手绘图案。<br>
这里有 R16 A1 整机 12 件打印包、固件和 Android App。**复刻资料 R1** 对应固件和 App **5.2.2**。

<a href="https://github.com/yuhuang007/LuluClock_V5.2.2/releases/download/v5.2.2/LuluClock-Prototype-720p.mp4"><img src="docs/assets/banner.jpg" alt="成品实拍：白色噜噜绘时钟、顶部橘子键帽、侧面 OLED 与正面双舵机机械臂。点击下载作品视频。" width="100%"></a>

<a href="https://yuhuang007.github.io/LuluClock_V5.2.2/"><img src="docs/assets/action-guide.png" alt="打开网页版复刻教程" width="30%"></a> <a href="https://github.com/yuhuang007/LuluClock_V5.2.2/releases/download/repro-5.2.2-r1/LuluClock-5.2.2-R16-A1-R1-STL.zip"><img src="docs/assets/action-stl.png" alt="下载整机 12 件 STL" width="30%"></a> <a href="https://github.com/yuhuang007/LuluClock_V5.2.2/releases/download/v5.2.2/LuluClock-5.2.2.apk"><img src="docs/assets/action-apk.png" alt="下载 Android APK" width="30%"></a>

[开始复刻](https://yuhuang007.github.io/LuluClock_V5.2.2/) · [12 件 STL](https://github.com/yuhuang007/LuluClock_V5.2.2/releases/download/repro-5.2.2-r1/LuluClock-5.2.2-R16-A1-R1-STL.zip) · [下载 APK](https://github.com/yuhuang007/LuluClock_V5.2.2/releases/download/v5.2.2/LuluClock-5.2.2.apk) · [作品视频](https://github.com/yuhuang007/LuluClock_V5.2.2/releases/download/v5.2.2/LuluClock-Prototype-720p.mp4)

**ESP32-S3 N16R8 · 双 SG90 · 可选 SSD1306 · Android 8+（需较新 WebView）**

[实拍](#01--实际画出来是什么样) · [App 动效](#02--app-的液态玻璃与动效) · [打印](#03--外壳和机械臂一次下齐) · [复刻](#04--从备料到第一笔) · [原理](#05--一笔怎么到达板面) · [源码](#06--工程地图)

</div>

> **第一次做：先只接主控。** 保持舵机、灯头和电池断开，先烧录、连 App、关闭自动绘时，再按[首次上电与装臂流程](hardware/commissioning.md)逐路加负载。外壳可以等台架走通再打印。

## 01 · 实际画出来是什么样

<p align="center">
  <img src="docs/assets/drawing-time.gif" alt="装好的时钟移动灯头，在蓄光板上画出时间" width="560">
</p>

画线时灯头亮起，换笔时灭灯移动。完成后，线条会在板面短暂停留。它能按计划绘时，也能从 App 接收「你好世界」或随手画的图案。

**已完成一台整机装配并完成实机演示。** [3 分 46 秒的成品视频](https://github.com/yuhuang007/LuluClock_V5.2.2/releases/download/v5.2.2/LuluClock-Prototype-720p.mp4)拍到了灯头绘时、按 App 发来的笔画写字和画图、机顶实体按键切换侧面 OLED，以及平板启动倒计时后机身侧屏同步计时。

| 创作 | 时间与交互 | 自定义 |
| --- | --- | --- |
| 汉字按笔顺生成、自由手绘、尺寸预览、图案收藏 | 自动绘时、倒计时、番茄钟；机身侧屏显示时间、环境与任务 | 手机和平板布局、深浅主题、界面动画开关；OLED 亮度与休眠 |

## 02 · App 的液态玻璃与动效

手机底栏和平板侧栏以透明材质、边缘折射和滑动胶囊显示当前位置：手指移动时，胶囊跟随；松手切页时，拉伸并回弹。深浅主题则从点击点以圆形展开。

<p align="center">
  <img src="docs/assets/glass-motion.gif" alt="液态玻璃胶囊随点击或拖动滑动，右上角触发深浅主题圆形切换" width="720">
</p>

**连上的时候，用笔画出一台小钟；主动断开时，用橡皮擦把它收起来。** 应用内「设置 → 外观与主题 → 完整动效」可预览连接与断开，无需连接设备。动效也可以跟随系统或关闭。

<details>
<summary><strong>展开：笔绘与擦除、手机与平板、侧面 OLED</strong></summary>

![连接时用笔画出时钟，断开时用橡皮擦收起时钟](docs/assets/connection-motion.jpg)

![同一 APK 的手机设备总览、倒计时与平板深色创作页](docs/assets/app.jpg)

![侧面 OLED 的时间页、环境页和任务页](docs/assets/oled.jpg)

OLED 是 0.96 英寸 SSD1306，128 × 64。设备空闲时长按中键 5 秒进入设置，松开后左选、右改、中键短按保存；再次松开并长按中键 5 秒退出。

</details>

<sub>本节 App 动图与截图由当前应用在浏览器中渲染，样例设备状态为模拟；折射及主题效果取决于 Android WebView 的支持情况。</sub>

## 03 · 外壳和机械臂一次下齐

[<img src="docs/assets/print-kit.jpg" alt="整机 12 件打印网格：A1 主壳、R16 前面板、三个键帽、USB 挡块、四件连杆、正面绘制屏背板和灯光盖" width="100%">](hardware/enclosure/README.md)

| 下载 | 里面有什么 |
| --- | --- |
| **[整机 STL 压缩包](https://github.com/yuhuang007/LuluClock_V5.2.2/releases/download/repro-5.2.2-r1/LuluClock-5.2.2-R16-A1-R1-STL.zip)** | **12 件**：六件 R16 A1 外壳件、四件连杆、正面绘制屏背板和灯光盖；附部件清单、验收表及 SHA-256 |
| **[R16 A1 外壳 Blender 文件](hardware/enclosure/LuluClock-R16-A1.blend)** | 六件外壳的可编辑网格；连杆、背板和灯光盖使用随包 STL |
| **[逐件 STL 与装配说明](hardware/enclosure/README.md)** | 打印方向、关键中心距、试装顺序和合壳前检查 |
| **[A4 台架图](hardware/bench-jig.svg)** | 1:1 校核轴心距和孔位；没有打印机也可先用平板搭台架 |

复刻时用 **毫米、100%** 切片，按[逐件说明](hardware/enclosure/README.md)查看 07 号低座主动臂和 10 号灯头连杆的层预览。把背板、灯盖和舵盘放到自己的打印件上试配，再按实际孔距、层差和运动间隙确定两根主动臂的位置。

## 04 · 从备料到第一笔

**完整步骤见 [网页版教程](https://yuhuang007.github.io/LuluClock_V5.2.2/)**。离线阅读请下载[含当前教程的工程 ZIP](https://github.com/yuhuang007/LuluClock_V5.2.2/archive/refs/heads/main.zip)，解压后打开 [`docs/index.html`](docs/index.html)。[R1 发布页](https://github.com/yuhuang007/LuluClock_V5.2.2/releases/tag/repro-5.2.2-r1) 保留当时的固定快照、12 件 STL 和校验值。

| 步骤 | 看哪份资料 | 完成标志 |
| --- | --- | --- |
| **01 核对用料** | [物料表](hardware/bom.csv) | 核对板型、舵盘和舵机支路；记录实际模块与紧固件 |
| **02 主控先通** | [Arduino IDE / CLI](firmware/README.md) · [App 首次连接](android-app/README.md) | 只给主控上电；串口烧录后连 App，关闭自动绘时和计划 |
| **03 分步加负载** | [接线图与实测方法](hardware/wiring.md) | 正视左 **GPIO5**、右 **GPIO4**；不装臂试舵机，记录板端电压 |
| **04 打印与试配** | [整机 12 件 STL](hardware/enclosure/README.md) | 检查关节叠层、背板和灯盖，确认手动行程无卡滞 |
| **05 装臂和空走** | [首次调试流程](hardware/commissioning.md) | 灯头物理断开；验证 A/B 姿态、归位与净空 |
| **06 第一次实绘** | [验收记录表](hardware/validation-record.md) | 测中央和近边缘 **10 × 10 mm** 方框，再试时间和汉字 |

<details>
<summary><strong>展开 5.2.2 接线总览</strong></summary>

[![ESP32-S3 的舵机、三键、OLED、灯驱动、传感器和 UART0 连接图](docs/assets/wiring.svg)](hardware/wiring.svg)

GPIO6、GPIO11 是控制信号，分别接灯头限流驱动和灯带驱动。双 SG90 用合适的 5 V 负载支路，与主控共地。详情和分步检查见 [接线说明](hardware/wiring.md)。

</details>

## 05 · 一笔怎么到达板面

![从 App 画布生成毫米轨迹，经 BLE 发给 ESP32-S3，运动规划控制舵机与灯头](docs/assets/signal-flow.jpg)

1. **迹线生成**：App 把手绘或汉字笔顺换算成毫米坐标，经 BLE 分段发送。
2. **运动求解**：ESP32-S3 检查可达范围，分别计算两个舵机的目标和运动时序。
3. **实机成像**：连杆定位灯头，按笔画亮灭。固件控制的是开环目标，实际尺寸和亮度仍由机械校准与光学间隙决定。

## 06 · 工程地图

| 目录 | 主要内容 |
| --- | --- |
| [`hardware/`](hardware/) | R16 A1 外壳、12 件 STL、19 项物料表、接线和校准 |
| [`firmware/`](firmware/) | `JianClock.ino`、ESP32-S3 / BLE / OLED、运动规划 |
| [`android-app/`](android-app/) | Java + WebView，手绘与汉字、液态玻璃、手动 OTA 和回归 |
| [`docs/`](docs/) | 自包含网页版教程、实拍、动图和复刻图解 |

**构建入口**：[ESP32-S3 固件](firmware/README.md)使用 Arduino ESP32 **3.3.12** 与 U8g2 **2.36.19**；[Android 源码](android-app/README.md)使用 JDK 17 与 Android SDK 35。老手机请先更新系统 WebView；当前时钟按 **UTC+8** 显示。公开 APK 不内置固件，空板须先走串口烧录。安装、权限和手动 OTA 见 [Android 指南](android-app/README.md)。

**源码坐标**：[引脚配置](firmware/JianClock/Config.h) · [几何求解](firmware/JianClock/Geometry.h) · [运动规划](firmware/JianClock/MotionExecutor.h) · [App 界面](android-app/assets/index.html) · [玻璃和主题](android-app/assets/app418.js) · [连接动效](android-app/assets/connection-motion.js)

**来源与许可**：见 [THIRD_PARTY.md](THIRD_PARTY.md)。汉字笔顺等第三方素材保留原许可；原创代码、设计和文档尚未指定统一授权。
