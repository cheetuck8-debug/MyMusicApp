# MyMusic — 你的私人离线音乐 App

像 YouTube Premium 一样：**无广告、后台播放、离线听**，还能从 YouTube 下载转 MP3。

## 快速开始（电脑上）

1. 双击 **`start_server.bat`**
2. 浏览器自动打开 `http://127.0.0.1:8800` —— 这就是你的音乐 App

## 装到 iPhone（像 app 一样用）

1. 电脑和 iPhone 连**同一个 WiFi**
2. 电脑上 `Win+R` 输入 `cmd`，运行 `ipconfig`，记下 **IPv4 地址**（如 `192.168.1.5`）
3. iPhone 用 **Safari** 打开 `http://<IPv4地址>:8800`
4. 点底部 **分享按钮** → **添加到主屏幕** → 添加
5. 桌面出现 MyMusic 图标，点开即全屏 App

> ⚠️ **重要**：从局域网地址添加主屏幕后，打开 App 需要电脑开机且服务在运行（下载功能依赖电脑）。**已下载到手机的歌可以完全离线播放**，不依赖网络。
>
> 提示：想让下载功能真正"随时随地用"，把 app 部署到免费网页托管（见下文"部署到云端"），下载时只需电脑开着服务。

## 功能

| 功能 | 说明 |
|---|---|
| 🎵 我的音乐 | 导入手机/电脑本地 MP3、M4A、WAV，存手机离线听 |
| ⬇️ 在线下载 | 搜索 YouTube 歌曲 → 下载转 MP3 → 自动存入"我的音乐" |
| ▶️ 后台播放 | 锁屏/切后台继续播放，锁屏界面可控制 |
| 🚫 无广告 | 自己的 app，自己的播放器 |

## 文件说明

| 文件 | 作用 |
|---|---|
| `start_server.bat` | 双击启动（后端 8800 端口，同时托管页面和下载 API） |
| `server.py` | Python 后端：yt-dlp 搜索/下载/转 MP3 + 页面托管 |
| `index.html` / `app.js` | 前端界面和逻辑（IndexedDB 离线存储 + 播放器） |
| `sw.js` / `manifest.json` | PWA 离线缓存 / 安装配置 |
| `icon-*.png` | App 图标 |
| `downloads/` | 下载的 MP3 临时目录（2 小时后自动清理） |
| `make_icon.py` | 重新生成图标（纯 Python 无依赖） |

## 部署到云端（可选，免费）

把前端（index.html、app.js、sw.js、manifest.json、icon-*.png）放到 GitHub Pages / Cloudflare Pages / Netlify，
手机就能通过 HTTPS 安装正式 PWA（`https://你的域名`），即使不开电脑也能打开 App 听已下载的歌。
下载功能仍需要电脑上跑 `server.py`（前端会自动连电脑的 IP:8800 —— 需要把 `app.js` 里的 API 地址改为电脑局域网 IP 或公网地址）。
