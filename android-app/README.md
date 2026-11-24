# Android 伴侣应用

这是噜噜绘时钟 5.2.2 的 Android 伴侣应用，支持 Android 8（API 26）及以上系统和 BLE。手机与平板使用同一个 APK。`src/` 是原生界面与设备连接，`assets/index.html` 是 WebView 页面入口。

## 连接与首次绘制

1. 安装 [Release 中的 APK](https://github.com/yuhuang007/LuluClock_V5.2.2/releases/tag/v5.2.2)。给设备上电，打开系统蓝牙；首次启动按系统提示允许扫描与连接。
2. 在设备页连接噜噜绘时钟。检查显示的设备固件号，先同步时间，再执行绘时。
3. 在创作页输入「你好世界」或手绘图案，预览位置及大小后发送。进度以设备和 OLED 的回传为准。

公开版 APK 不内置固件。首次烧录请按仓库的固件说明操作。已运行且支持 OTA 的设备可在「设备设置 → 固件更新 → 选择应用固件 .bin」中，选用本地编译的应用镜像 `JianClock.ino.bin`。连接同一 Wi-Fi、保持蓝牙和设备供电，确认后开始升级；重启后检查从设备读取的版本。`merged`、`bootloader`、`partitions` 文件均不能用于 OTA。

## 本地构建

需要 Python 3、JDK 17、Android SDK Platform 35 和 Build Tools 35.0.0。可用 Android Studio 的 SDK Manager 安装两个 SDK 组件，也可执行：

```sh
sdkmanager "platforms;android-35" "build-tools;35.0.0"
```

配置 `JAVA_HOME` 和 `ANDROID_HOME`，在仓库根目录运行：

```sh
python android-app/build.py
```

也可传 `--jdk <JDK目录>`、`--sdk <SDK目录>`。默认输出 `android-app/build/LuluClock-unsigned.apk`，适合验证构建；Android 安装需要签名。

### 使用自己的签名

可用 `keytool` 准备本地开发密钥（口令交互输入），或者使用现有开发密钥：

```sh
keytool -genkeypair -keystore lulu-dev.p12 -storetype PKCS12 -alias lulu-dev -keyalg RSA -keysize 2048 -validity 3650
```

在本地进程环境设置 `LULUCLOCK_KEYSTORE_PASSWORD`。如密钥口令不同，再设置 `LULUCLOCK_KEY_PASSWORD`。运行：

```sh
python android-app/build.py --keystore lulu-dev.p12 --alias lulu-dev
```

签名输出为 `android-app/build/LuluClock.apk`。不同签名的 APK 不能相互覆盖安装：公开 Release 使用独立签名，不能覆盖原私有发行版；你自己签出的 APK 也不能覆盖公开 Release。建议使用独立测试设备，避免卸载时丢失应用里的收藏和设置。密钥和口令留在本机。

## 回归检查

以下命令从仓库根目录运行，只需要 Node.js 22 或更新版本，无需设备：

```sh
node android-app/tests/drawing_scale_node.js
node android-app/tests/drawing_path_node.js
node android-app/tests/hanzi_node.js
node android-app/tests/policy_model_node.js
node android-app/tests/v4115_ota_node.js
```

这些测试检查画布等比尺寸、笔顺及发送坐标、日常策略和模拟 OTA 重连。真实 BLE、升级与绘制效果仍需实机验证。

汉字中线数据源为 [Make Me a Hanzi](https://github.com/skishore/makemeahanzi)；数据许可与修改说明随源码和 APK 一并提供，见 [assets/licenses](assets/licenses/)。
