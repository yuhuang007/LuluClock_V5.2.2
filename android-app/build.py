"""Build the Android companion with JDK 17 and Android SDK 35."""

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile


ROOT = Path(__file__).resolve().parent
EXE = ".exe" if os.name == "nt" else ""
STORE_PASSWORD = "LULUCLOCK_KEYSTORE_PASSWORD"
KEY_PASSWORD = "LULUCLOCK_KEY_PASSWORD"


def run(*args, cwd=None):
    subprocess.run([str(arg) for arg in args], cwd=cwd, check=True)


def java_tool(name, jdk):
    if jdk:
        path = jdk / "bin" / (name + EXE)
        return path if path.is_file() else None
    return shutil.which(name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sdk", type=Path, help="Android SDK directory (or set ANDROID_HOME)")
    parser.add_argument("--jdk", type=Path, help="JDK directory (or set JAVA_HOME)")
    parser.add_argument("--out", type=Path, default=ROOT / "build", help="output directory")
    parser.add_argument("--keystore", type=Path, help="optional developer-owned keystore")
    parser.add_argument("--alias", help="key alias; required when signing")
    args = parser.parse_args()
    if bool(args.keystore) != bool(args.alias):
        parser.error("--keystore and --alias must be supplied together")
    if args.keystore:
        if not args.keystore.is_file():
            parser.error("keystore does not exist")
        if not os.environ.get(STORE_PASSWORD):
            parser.error(f"set {STORE_PASSWORD} before signing")

    sdk_dir = args.sdk or os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    if not sdk_dir:
        parser.error("set ANDROID_HOME or pass --sdk")
    sdk = Path(sdk_dir).resolve()
    tools = sdk / "build-tools" / "35.0.0"
    android = sdk / "platforms" / "android-35" / "android.jar"
    aapt2, zipalign = (tools / (name + EXE) for name in ("aapt2", "zipalign"))
    d8 = tools / "lib" / "d8.jar"
    apksigner = tools / "lib" / "apksigner.jar"
    lambdas = tools / "core-lambda-stubs.jar"
    needed = [android, aapt2, zipalign, d8, lambdas] + ([apksigner] if args.keystore else [])
    missing = [str(p.relative_to(sdk)) for p in needed if not p.is_file()]
    if missing:
        parser.error("install Android SDK Platform 35 and Build Tools 35.0.0; missing " + ", ".join(missing))
    jdk_dir = args.jdk or os.environ.get("JAVA_HOME")
    jdk = Path(jdk_dir).resolve() if jdk_dir else None
    java, javac = (java_tool(name, jdk) for name in ("java", "javac"))
    if not java or not javac:
        parser.error("install JDK 17 and set JAVA_HOME or pass --jdk")

    out = args.out.resolve()
    with tempfile.TemporaryDirectory(prefix="LuluClock-APK-") as temp:
        build = Path(temp)
        staged = build / "project"
        staged.mkdir()
        for folder in ("src", "assets", "res"):
            ignored = shutil.ignore_patterns("firmware") if folder == "assets" else None
            shutil.copytree(ROOT / folder, staged / folder, ignore=ignored)
        shutil.copyfile(ROOT / "AndroidManifest.xml", staged / "AndroidManifest.xml")
        classes, dex, generated = (build / name for name in ("classes", "dex", "generated"))
        for directory in (classes, dex, generated):
            directory.mkdir()
        resources = build / "resources.zip"
        resource_apk = build / "resources.apk"
        # Windows native SDK tools may interpret absolute file arguments with a legacy code page.
        android_input = android
        if os.name == "nt" and not str(android).isascii():
            shutil.copyfile(android, build / "android.jar")
            android_input = Path("android.jar")
        run(aapt2, "compile", "--dir", "project/res", "-o", resources.name, cwd=build)
        run(aapt2, "link", "-o", resource_apk.name, "--manifest", "project/AndroidManifest.xml",
            "-I", android_input, "-A", "project/assets", "--java", generated.name, resources.name, cwd=build)

        sources = sorted([*(staged / "src").rglob("*.java"), *generated.rglob("*.java")])
        argfile = build / "javac.args"
        options = ["-encoding", "UTF-8", "-source", "8", "-target", "8",
                   "-bootclasspath", f"{android}{os.pathsep}{lambdas}", "-d", classes, *sources]
        argfile.write_text("\n".join('"' + str(arg).replace("\\", "/").replace('"', '\\"') + '"'
                                    for arg in options), encoding="utf-8")
        run(javac, "-J-Dfile.encoding=UTF-8", "@" + str(argfile))
        run(java, "-cp", d8, "com.android.tools.r8.D8", "--release", "--min-api", "26",
            "--lib", android, "--output", dex, *sorted(classes.rglob("*.class")))

        with zipfile.ZipFile(resource_apk, "a", zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(dex.glob("*.dex")):
                archive.write(path, path.name)
        aligned = build / "unsigned.apk"
        run(zipalign, "-f", "4", resource_apk.name, aligned.name, cwd=build)
        if args.keystore:
            apk = build / "signed.apk"
            password = ["--key-pass", f"env:{KEY_PASSWORD}"] if os.environ.get(KEY_PASSWORD) else []
            run(java, "-jar", apksigner, "sign", "--ks", args.keystore.resolve(),
                "--ks-pass", f"env:{STORE_PASSWORD}", "--ks-key-alias", args.alias,
                *password, "--out", apk, aligned)
            run(java, "-jar", apksigner, "verify", apk)
            name = "LuluClock.apk"
        else:
            apk = aligned
            name = "LuluClock-unsigned.apk"
        run(zipalign, "-c", "4", apk.name, cwd=build)
        out.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(apk, out / name)
    print(f"APK built: {out / name}")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        raise SystemExit(f"Android build tool failed with exit code {error.returncode}.") from None
