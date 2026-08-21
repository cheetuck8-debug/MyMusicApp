# -*- coding: utf-8 -*-
"""
MyMusic 下载后端
- GET  /search?q=关键词        -> 用 yt-dlp 搜索 YouTube，返回候选列表
- POST /download {"url":...}   -> 下载并转 MP3，返回可下载的 mp3 地址
- GET  /files/<name>.mp3       -> 下载已转好的 mp3
启动：python server.py   (默认 0.0.0.0:8800)
"""
import json
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

import yt_dlp

# 云端（Render）会用环境变量注入 PORT；本地默认 8800
HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "8800"))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DL_DIR = os.path.join(BASE_DIR, "downloads")
os.makedirs(DL_DIR, exist_ok=True)

# 清理历史 mp3（超过 2 小时），避免占满磁盘
MAX_AGE = 2 * 3600


def cleanup_old_files():
    now = time.time()
    for fn in os.listdir(DL_DIR):
        p = os.path.join(DL_DIR, fn)
        try:
            if os.path.isfile(p) and now - os.path.getmtime(p) > MAX_AGE:
                os.remove(p)
        except OSError:
            pass


SEARCH_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "noplaylist": True,
}


def search_youtube(q, limit=6):
    """搜索 YouTube。优先用 Piped API（云服务器 IP 不被 YouTube 封锁），失败则回退 yt-dlp 搜索。"""
    # 方法 1: Piped API（第三方前端，数据中心 IP 可用）
    piped_instances = [
        "https://pipedapi.kavin.rocks",
        "https://api.piped.private.coffee",
        "https://pipedapi.adminforge.de",
    ]
    import urllib.request

    for base in piped_instances:
        try:
            url = f"{base}/search?q={urllib.parse.quote(q)}&filter=videos"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            results = []
            for item in (data.get("items") or [])[:limit]:
                if not item.get("url"):
                    continue
                # Piped 的 url 形如 /watch?v=ID
                vid = item["url"].split("v=")[-1]
                dur = item.get("duration") or 0
                if dur and dur > 3600:
                    continue
                results.append({
                    "url": f"https://www.youtube.com/watch?v={vid}",
                    "title": item.get("title") or "",
                    "artist": item.get("uploaderName") or item.get("uploader") or "",
                    "duration": dur,
                    "thumb": item.get("thumbnail") or "",
                })
            if results:
                return results
        except Exception:
            continue

    # 方法 2: yt-dlp 搜索（本地/家宽 IP 可用）
    with yt_dlp.YoutubeDL(SEARCH_OPTS) as ydl:
        info = ydl.extract_info(f"ytsearch{limit}:{q}", download=False)
    results = []
    for e in (info.get("entries") or []):
        if not e or not e.get("id"):
            continue
        dur = e.get("duration") or 0
        if dur and dur > 3600:
            continue
        results.append({
            "url": f"https://www.youtube.com/watch?v={e['id']}",
            "title": e.get("title") or "",
            "artist": e.get("uploader") or e.get("channel") or "",
            "duration": dur,
            "thumb": (e.get("thumbnails") or [{}])[-1].get("url", ""),
        })
    return results


def download_mp3(url):
    """下载并转 mp3，返回 (本地路径, 标题, 上传者, 时长, 封面)。"""
    info_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
    }
    with yt_dlp.YoutubeDL(info_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    video_id = info.get("id", str(int(time.time())))
    outtmpl = os.path.join(DL_DIR, f"{video_id}.%(ext)s")
    dl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "outtmpl": outtmpl,
        "format": "bestaudio/best",
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
    }
    with yt_dlp.YoutubeDL(dl_opts) as ydl:
        ydl.download([url])

    mp3 = os.path.join(DL_DIR, f"{video_id}.mp3")
    if not os.path.exists(mp3):
        raise RuntimeError("MP3 转换失败")
    thumb = (info.get("thumbnails") or [{}])[-1].get("url", "")
    return mp3, info.get("title", ""), info.get("uploader") or info.get("channel") or "", info.get("duration") or 0, thumb


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        print("[%s] %s" % (time.strftime("%H:%M:%S"), fmt % args))

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def _serve_static(self, fn, ctype):
        fp = os.path.join(BASE_DIR, fn)
        if not os.path.exists(fp):
            self._json(404, {"error": "Not Found"})
            return
        size = os.path.getsize(fp)
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(size))
        self.send_header("Cache-Control", "no-cache")
        self._cors()
        self.end_headers()
        with open(fp, "rb") as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                self.wfile.write(chunk)

    def do_GET(self):
        u = urlparse(self.path)

        # ---- 前端静态文件（同源托管，手机访问 http://IP:8800 即前端页面）----
        if u.path in ("/", "/index.html"):
            self._serve_static("index.html", "text/html; charset=utf-8")
            return
        static_map = {
            "/app.js": ("app.js", "application/javascript"),
            "/sw.js": ("sw.js", "application/javascript"),
            "/manifest.json": ("manifest.json", "application/manifest+json"),
            "/icon-192.png": ("icon-192.png", "image/png"),
            "/icon-512.png": ("icon-512.png", "image/png"),
        }
        if u.path in static_map:
            fn, ctype = static_map[u.path]
            self._serve_static(fn, ctype)
            return

        if u.path == "/search":
            q = parse_qs(u.query).get("q", [""])[0].strip()
            if not q:
                self._json(400, {"error": "缺少关键词"})
                return
            try:
                results = search_youtube(q)
                self._json(200, {"results": results})
            except Exception as ex:
                self._json(500, {"error": f"搜索失败: {ex}"})
            return
        if u.path.startswith("/files/"):
            fn = os.path.basename(u.path)
            fp = os.path.join(DL_DIR, fn)
            if not os.path.exists(fp):
                self._json(404, {"error": "文件不存在或已过期"})
                return
            size = os.path.getsize(fp)
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(size))
            self.send_header("Content-Disposition", f'attachment; filename="{fn}"')
            self._cors()
            self.end_headers()
            with open(fp, "rb") as f:
                while True:
                    chunk = f.read(65536)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
            return
        self._json(404, {"error": "Not Found"})

    def do_POST(self):
        u = urlparse(self.path)
        if u.path != "/download":
            self._json(404, {"error": "Not Found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
            url = (body.get("url") or "").strip()
        except Exception:
            self._json(400, {"error": "请求格式错误"})
            return
        if not url:
            self._json(400, {"error": "缺少 url"})
            return
        try:
            mp3, title, artist, dur, thumb = download_mp3(url)
            self._json(200, {
                "ok": True,
                "mp3": f"/files/{os.path.basename(mp3)}",
                "title": title,
                "artist": artist,
                "duration": dur,
                "thumb": thumb,
            })
        except Exception as ex:
            self._json(500, {"error": f"下载失败: {ex}"})


if __name__ == "__main__":
    # 后台线程定期清理
    def cleaner():
        while True:
            time.sleep(600)
            try:
                cleanup_old_files()
            except Exception:
                pass

    threading.Thread(target=cleaner, daemon=True).start()
    print(f"MyMusic 已启动: http://{HOST}:{PORT}")
    print("本机: http://127.0.0.1:8800")
    print("同一 WiFi 手机: http://<本机IP>:8800  (ipconfig 看 IPv4 地址，手机 Safari 打开后点 分享->添加到主屏幕)")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
