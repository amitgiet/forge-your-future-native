@echo off
set "JAVA_HOME=C:\Program Files\Java\jdk-21.0.10"
set "ANDROID_HOME=C:\Users\Admin\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%PATH%"
echo JAVA_HOME is %JAVA_HOME%
echo ANDROID_HOME is %ANDROID_HOME%
call .\gradlew.bat clean assembleDebug
