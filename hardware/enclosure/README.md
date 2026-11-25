# R16 装配修订 A1 · 整机打印包

[下载 12 件 STL 压缩包](https://github.com/yuhuang007/LuluClock_V5.2.2/releases/download/repro-5.2.2-r1/LuluClock-5.2.2-R16-A1-R1-STL.zip) · [逐件 STL](stl/) · [外壳 Blender](LuluClock-R16-A1.blend)

整套包含 **R16 A1 六件外壳与安装件、四件机械臂、正面绘制屏背板和灯光盖，共 12 件**。主壳和前面板维持 R16 A1 配置，侧窗适配 0.96 英寸 OLED。外壳 Blender 文件保留六个可编辑网格；连杆、背板和灯盖单独提供 STL。

[成品实拍](https://github.com/yuhuang007/LuluClock_V5.2.2/releases/download/v5.2.2/LuluClock-Prototype-720p.mp4)里是一台已装好的时钟：顶部有三颗键帽，侧面是 OLED，前面是连杆和蓝色灯盖。可对照下表辨认这些部件；自制时请按自己的舵盘、螺钉和切片设置检查配合。

| STL | 件数 | 内容 |
| --- | ---: | --- |
| [`01-shell-R16-A1`](stl/01-shell-R16-A1.stl) | 1 | A1 主壳（开关、蜂鸣器与前盖导入局部避让） |
| [`02-front-panel-R16`](stl/02-front-panel-R16.stl) | 1 | R16 前面板，含 SG90 安装位置与凹刻 |
| [`03-button-left`](stl/03-button-left.stl) · [`04-button-right`](stl/04-button-right.stl) | 2 | 左、右键帽各一 |
| [`05-button-center`](stl/05-button-center.stl) | 1 | 中央橘子键帽 |
| [`06-usb-stop`](stl/06-usb-stop.stl) | 1 | Type-C 实心 T 形挡块 |
| [`07-active-arm-low`](stl/07-active-arm-low.stl) | 1 | 低座主动臂，网格总高 6.25 mm |
| [`08-active-arm-high`](stl/08-active-arm-high.stl) | 1 | 高座主动臂，网格总高 7.62 mm |
| [`09-right-follower-slotted`](stl/09-right-follower-slotted.stl) | 1 | 两孔直槽随动杆 F–Q |
| [`10-lamp-link-slotted`](stl/10-lamp-link-slotted.stl) | 1 | 三孔灯头连杆 E–P–Q，带斜槽和灯头座 |
| [`11-screen-backplate`](stl/11-screen-backplate.stl) | 1 | 正面绘制屏背板，约 83.70 × 46.60 × 1.69 mm |
| [`12-light-cover`](stl/12-light-cover.stl) | 1 | 灯光盖，先试配扣合、出光方向和引线 |

## 切片和配合

- 所有文件按 **mm、100%** 导入，勿镜像。主壳建议背面贴平台、开口朝上；前面板检查舵机安装座的支撑。键帽导柱和活动面去毛刺，凹刻、USB 开口和按钮回弹都先试装再固定。可从 0.4 mm 喷嘴、0.16–0.20 mm 层高开始试打。
- 按坐标精度 0.0001 mm 分组检查网格，07、10 分别有 47、371 个重复三角面，07、08、09、12 各有多个连通网格。打印前用逐层预览检查槽口保持开放、关节孔壁和舵机座连续、成品区域连通。若切片器提示修复，比较修复前后的预览，尤其检查槽、孔和座的位置及壁厚；打印后用自己的紧固件试配。
- 07 和 08 的总高由整件 STL 外廓量得，包括座体。两个模型的主动臂孔中心距均约 35 mm；固件的名义值为左 33.35 mm、右 34.85 mm。高低座是零件区分，左右要对照实物舵盘、错层、走线和行程试配。先试穿舵盘、螺钉、垫片和灯珠，检查防转固定。
- 从正面看，两舵机输出轴的名义间距为 **25.00 mm**。摆放三孔件时，按 [名义几何图](../bench-jig.svg) 检查 E→P 右侧的 Q。先断电检查关节和错层，再灭灯空走全程，确认连杆、灯盖和紧固件不会擦到前面板、蓄光面或线束。

## 装配顺序

1. 试放主控、0.96 英寸 OLED、顶部按键和开关。分别核对侧面 OLED PCB 与开窗；把 11 号背板试放在**正面绘制窗**，检查插入方向、框位、蓄光材料厚度和合壳余量。使用可选的 Type-C 充电板时，另核对 PCB、USB 孔与挡块的配合。
2. 按 [接线与分步上电](../wiring.md) 验证功能。开关、键帽按各自开口放入，挡块在模块就位后插入。舵机装入前盖；试合 12 号灯盖，确认出光口对位、引线不被压住，活动线束留出行程。
3. 按[首次上电到第一笔](../commissioning.md)，在合壳前完成装臂、空走、单独试灯和 **10 × 10 mm** 实绘。最后复查灯头间隙、USB、按钮、侧屏、温升及维护口，并填[实机验证记录](../validation-record.md)。

电子件、舵盘、紧固件、垫片、LED 和蓄光材料另备，见 [BOM](../bom.csv)。[A4 台架模板](../bench-jig.svg) 用于核对固件名义孔距和机械分支。
