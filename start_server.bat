@echo off
title MyMusic 音乐服务
cd /d "%~dp0"

echo ============================================
echo   MyMusic - 正在启动...
echo   启动后自动打开浏览器: http://127.0.0.1:8800
echo   手机同一 WiFi 访问: http://本机IP:8800
echo   （IP 用 ipconfig 查看，首次访问如提示防火墙请点"允许"）
echo   关闭本窗口 = 停止服务
echo ============================================
echo.

start "" http://127.0.0.1:8800
python server.py
pause
