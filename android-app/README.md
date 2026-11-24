# Android 伴侣应用

这是噜噜绘时钟 5.2.2 的 Android 伴侣应用，手机与平板使用同一个 APK。安装需要 Android 8（API 26）或更高版本，设备须支持 BLE。应用界面还依赖较新的系统 WebView；在旧手机上请先更新 Android System WebView 或作为 WebView 提供方的 Chrome。玻璃效果和动效也取决于实际 WebView。`src/` 是原生界面与设备连接，`assets/index.html` 是 WebView 页面入口。

## 连接与首次绘制

1. 下载[公开发行的 APK](https://github.com/yuhuang007/LuluClock_V5.2.2/releases/download/v5.2.2/LuluClock-5.2.2.apk)，用浏览器下载页或文件管理器打开。若系统询问是否允许安装应用，只允许你本次使用的来源即可。已有别的签名版本时，先看下方的[签名和数据保留说明](#使用自己的签名)。
2. 给主控上电、打开系统蓝牙。Android 8–11 需要允许定位并打开系统定位；Android 12 及以上需要允许「附近设备」。在「设备 → 扫描附近的时钟」选择「小噜时钟 + 12 位编号」，确认设备固件号。
3. App 连上设备会自动同步手机时间；也可在「设置 → 设备工具」点「同步手机时间」。同步的是时间戳；App 和固件均按北京时间（UTC+8）显示，不随手机时区切换。首次装机时，舵机和灯头保持断开。先关闭首页的「自动绘时」，再到「设置 → 自动计划」关闭「允许执行计划和整点提示」，并停用已启用的计划。主控重启后，接舵机前重新核对这些设置。
4. 按[首次上电与装臂流程](../hardware/commissioning.md)完成空走与灯头检查后，从「创作 → 测试图形」载入「校验方框」，确认画布尺寸为 10 × 10 mm 后发送。实绘通过后，再试手绘、汉字和自动绘时。

## 手动升级固件

空白主控先用[串口烧录](../firmware/README.md)。公开版 APK 不内置固件。

1. 在本地编译固件，从构建脚本 `Build output:` 显示的输出目录找到 `JianClock.ino.bin`，复制到手机的「下载」目录。`merged`、`bootloader`、`partitions` 文件用于串口流程，不能用于 OTA。
2. 在「设置 → 网络连接」给时钟配网，让手机和时钟连接同一可互访的 Wi-Fi。避开隔离设备之间通信的访客网络。
3. 打开「设置 → 固件更新 → 选择应用固件 .bin」，选中 `JianClock.ino.bin`，点「开始无线升级」。保持蓝牙连接和设备供电，设备重启后重新连接，检查读到的固件版本。

## 本地构建

需要 Python 3、JDK 17、Android SDK Platform 35 和 Build Tools 35.0.0。可用 Android Studio 的 SDK Manager 安装两个 SDK 组件，也可执行：

```sh
sdkmanager "platforms;android-35" "build-tools;35.0.0"
```

配置 `JAVA_HOME` 和 `ANDROID_HOME`，在仓库根目录运行：

```sh
python android-app/build.py
```

也可传 `--jdk <JDK目录>`、`--sdk <SDK目录>`。默认输出 `android-app/build/LuluClock-unsigned.apk`，适合验证构建；Android 安装需要签名。若构建工具因中文输出路径报错，可用 `--out C:\lulu-build\apk` 把输出指定到简短的纯英文目录。

### 使用自己的签名

可用 `keytool` 准备本地开发密钥（口令交互输入），或者使用现有开发密钥：

```sh
keytool -genkeypair -keystore lulu-dev.p12 -storetype PKCS12 -alias lulu-dev -keyalg RSA -keysize 2048 -validity 3650
```

在本地进程环境设置 `LULUCLOCK_KEYSTORE_PASSWORD`。如密钥口令不同，再设置 `LULUCLOCK_KEY_PASSWORD`。运行：

```sh
python android-app/build.py --keystore lulu-dev.p12 --alias lulu-dev
```

签名输出为 `android-app/build/LuluClock.apk`。包名相同但签名不同的 APK 不能覆盖安装。公开 Release 使用独立签名，不能覆盖原私有发行版；自己签出的 APK 也不能覆盖公开 Release。优先保留原安装，换独立测试设备。密钥和口令留在本机。

草稿、手机收藏和设置保存在应用本地。当前没有完整的导入导出，卸载应用或清除数据会丢失这些内容。设备的快捷图案只保存一幅，最多 512 个点，不能用来迁移手机收藏库。

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
