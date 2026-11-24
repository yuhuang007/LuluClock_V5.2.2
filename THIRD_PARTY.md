# 来源与许可

本仓库提供噜噜绘时钟的公开复刻资料，可从 README 的 R1 入口下载并按教程复刻。软件、模型、文档和演示素材尚未指定统一的改版与再分发许可；下表列出的第三方内容继续适用其相应条款。

| 内容 | 来源与处理 |
| --- | --- |
| 汉字笔顺中线 | 源自 [Make Me a Hanzi](https://github.com/skishore/makemeahanzi)；本工程的中线数据及其 Arphic Public License、原复制说明和转换声明见 [`android-app/assets/licenses/`](android-app/assets/licenses/)。 |
| 固件几何与时间轨迹 | S3 固件沿用早期兼容重实现的参数与绘时坐标；[`Geometry.h`](firmware/JianClock/Geometry.h) 和 [`Strokes.h`](firmware/JianClock/Strokes.h) 保留来源标注。仓库不附早期原固件、反汇编材料或映射文件。 |
| ESP32 Arduino、ESP-IDF 和 U8g2 | 依赖由用户安装，见 [固件说明](firmware/README.md)。[Arduino-ESP32 3.3.12](https://github.com/espressif/arduino-esp32/tree/3.3.12)、[ESP-IDF 5.5.5](https://github.com/espressif/esp-idf/tree/v5.5.5) 和 [U8g2 2.36.19](https://github.com/olikraus/u8g2/tree/2.36.19) 各自保留授权声明及组件条款。OLED 字库另见 [WenQuanYi Bitmap Song](https://github.com/olikraus/u8g2/wiki/fntgrpwqy) 和 [Logisoso](https://github.com/olikraus/u8g2/wiki/fntgrplogisoso)。发布包不含 ESP32 预编译固件。 |
| 演示 | 成品图、绘时动图取自原型实拍，作品视频含实拍与标注的合成说明；App 图、液态玻璃动图和连接分镜来自当前应用渲染配演示状态。OLED 图为固件画面示意。 |

来源、可复现范围或用料不清楚时，可在仓库提交说明并附具体文件或步骤。请避免在公开问题中附带设备地址、Wi-Fi 密码、签名密钥或个人信息。
