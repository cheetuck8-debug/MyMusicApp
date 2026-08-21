@echo off
title MyMusic 依赖安装
echo ============================================
echo   MyMusic - 一键安装依赖
echo ============================================
echo.

echo [1/3] 检查 Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo   ✗ 未检测到 Python！
    echo   请先到 https://www.python.org/downloads/ 下载安装
    echo   安装时务必勾选 "Add Python to PATH"
    pause
    exit /b 1
) else (
    for /f "delims=" %%v in ('python --version') do echo   ✓ %%v
)

echo.
echo [2/3] 安装 yt-dlp（下载工具）...
python -m pip install -U yt-dlp 2>nul
if errorlevel 1 (
    echo   ✗ yt-dlp 安装失败
    pause
    exit /b 1
) else (
    echo   ✓ yt-dlp 安装完成
)

echo.
echo [3/3] 检查 ffmpeg（转 MP3 工具）...
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo   未检测到 ffmpeg，正在安装...
    winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements >nul 2>&1
    if errorlevel 1 (
        echo   ✗ ffmpeg 自动安装失败，请手动下载: https://www.gyan.dev/ffmpeg/builds/
        echo     解压后把 bin 文件夹加入系统 PATH
        pause
        exit /b 1
    ) else (
        echo   ✓ ffmpeg 安装完成
    )
) else (
    echo   ✓ ffmpeg 已存在
)

echo.
echo ============================================
echo   全部就绪！接下来双击 start_server.bat 启动
echo ============================================
pause
