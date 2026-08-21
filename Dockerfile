# MyMusic 云后端 — Render 部署
FROM python:3.12-slim

# yt-dlp 转 MP3 需要 ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8800

CMD ["python", "server.py"]
