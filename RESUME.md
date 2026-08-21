# MyMusic 回家续接指南（傻瓜版）

这个文件夹是"MyMusic 音乐 App"项目。所有代码都在 GitHub 上，换电脑也不会丢。

---

## 回家后 3 步（全鼠标操作，不用命令行）

### 第 1 步：下载项目压缩包

1. 浏览器打开：https://github.com/cheetuck8-debug/MyMusicApp
2. 点绿色 **Code** 按钮 → 点 **Download ZIP**
3. 解压到桌面（得到 `MyMusicApp` 文件夹）

### 第 2 步：一键装依赖

1. 打开解压后的 `MyMusicApp` 文件夹
2. **双击 `install.bat`**（自动装 yt-dlp + ffmpeg，黑窗口跑完自动关）
3. 如果提示"python 不是内部命令"，先去 python.org 装 Python 3（勾选 Add to PATH），再双击一次

### 第 3 步：启动服务

1. 双击 **`start_server.bat`**
2. 浏览器自动打开 http://127.0.0.1:8800 —— 就是你的音乐 App
3. iPhone 用 Safari 打开 `http://电脑IP:8800` → 添加主屏幕

---

## 装好后（可选但推荐）：配隧道，人在外面也能下载

隧道 = 让你的电脑 IP 通过免费域名暴露出去，这样在外面也能用家里电脑下载歌。

配置方法：打开新电脑的 Hermes，说一句 **"继续 MyMusic 项目，配 Cloudflare Tunnel"**，让 AI 带你做（需要注册 cloudflare.com 账号，免费）。

---

## 常见问题

| 问题 | 解决 |
|---|---|
| 双击 bat 闪退 | 右键 bat → 以管理员身份运行 |
| 手机打不开 | 手机和电脑要同一 WiFi；确认防火墙放行 8800 |
| 下载失败 | 检查电脑上 start_server.bat 是否在运行 |
| 想改 app 名字 | 之后在 Render 控制台改，会换网址 |

## 文件说明

- `start_server.bat` — 启动服务（后端+页面）
- `install.bat` — 一键装依赖
- `server.py` — 后端（搜索/下载/转MP3）
- `index.html` + `app.js` — 前端界面
- `cookies.txt` — 你的 YouTube 登录凭据（**用不上，可以删**）
- `downloads/` — 下载的 MP3 临时文件夹

## 云端地址（已部署，随时可用）

- App 前端：https://cheetuck8-debug.github.io/MyMusicApp/
- 下载后端：https://mymusicapp-zrku.onrender.com （云端下载被 YouTube 限制，所以用隧道方案）

## 记住这一句

**回家后打开 Hermes，说："继续 MyMusic 项目，代码在 GitHub，帮我配隧道"** —— AI 会从会话记录恢复上下文，带你做完。
