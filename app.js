/* MyMusic - PWA 音乐应用核心逻辑 */
'use strict';

// ---------- 配置 ----------
// 默认同源（本地模式：server.py 同时托管页面和 API）。
// 部署到云端后，可在 app 内"设置"里填写电脑地址（http://电脑IP:8800），存在 localStorage。
let API_BASE = localStorage.getItem('apiBase') || location.origin;
const DB_NAME = 'mymusic-db';
const DB_VER = 1;

// ---------- IndexedDB ----------
let db;
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('songs')) {
        const store = d.createObjectStore('songs', { keyPath: 'id' });
        store.createIndex('title', 'title');
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function dbTx(mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', mode);
    const store = tx.objectStore('songs');
    const out = fn(store);
    tx.oncomplete = () => resolve(out && out.result !== undefined ? out.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function getAllSongs() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readonly');
    const req = tx.objectStore('songs').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getSong(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readonly');
    const req = tx.objectStore('songs').get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putSong(song) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readwrite');
    tx.objectStore('songs').put(song);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function deleteSong(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readwrite');
    tx.objectStore('songs').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- 状态 ----------
let playlist = [];
let currentIndex = 0;
let audio = new Audio();
audio.preload = 'metadata';

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const uploadBox = $('uploadBox'), fileInput = $('fileInput');
const libList = $('libList'), dlList = $('dlList');
const dlStatus = $('dlStatus');

// ---------- 工具 ----------
function fmtTime(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  s = Math.floor(s);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2600);
}
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// ---------- 渲染 ----------
function renderLibrary() {
  libList.innerHTML = '';
  if (!playlist.length) {
    libList.innerHTML = '<div class="empty">还没有音乐<br>点击上方导入，或去「在线下载」找歌</div>';
    return;
  }
  playlist.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'song';
    div.innerHTML = `
      <div class="thumb">${s.thumb ? `<img src="${esc(s.thumb)}">` : '🎵'}</div>
      <div class="info">
        <div class="title">${esc(s.title)}</div>
        <div class="artist">${esc(s.artist || '未知歌手')}</div>
      </div>
      <div class="dur">${fmtTime(s.duration)}</div>
      <div class="actions">
        <button class="icon-btn" data-del="${i}" title="删除">🗑️</button>
      </div>`;
    div.addEventListener('click', e => {
      if (e.target.closest('[data-del]')) return;
      playIndex(i);
    });
    libList.appendChild(div);
  });
}

function renderDlResults(results) {
  dlList.innerHTML = '';
  if (!results.length) {
    dlList.innerHTML = '<div class="empty">没搜到结果，换个关键词试试</div>';
    return;
  }
  results.forEach(r => {
    const div = document.createElement('div');
    div.className = 'song';
    div.innerHTML = `
      <div class="thumb">${r.thumb ? `<img src="${esc(r.thumb)}">` : '🎵'}</div>
      <div class="info">
        <div class="title">${esc(r.title)}</div>
        <div class="artist">${esc(r.artist || '')} · ${fmtTime(r.duration)}</div>
      </div>
      <div class="actions"><button class="icon-btn dl-btn" title="下载">⬇️</button></div>`;
    div.querySelector('.dl-btn').addEventListener('click', e => {
      e.stopPropagation();
      downloadTrack(r);
    });
    dlList.appendChild(div);
  });
}

// ---------- 播放器 ----------
async function playIndex(i) {
  if (i < 0 || i >= playlist.length) return;
  currentIndex = i;
  const song = playlist[i];
  try {
    const full = await getSong(song.id);
    if (!full) { toast('歌曲不存在'); return; }
    audio.src = URL.createObjectURL(full.blob);
    await audio.play();
    $('nowPlaying').style.display = 'flex';
    $('npThumb').innerHTML = full.thumb ? `<img src="${esc(full.thumb)}">` : '🎵';
    $('npTitle').textContent = full.title;
    $('npArtist').textContent = full.artist || '未知歌手';
    $('btnPlay').textContent = '⏸';
    setupMediaSession(full);
  } catch (err) {
    console.error(err);
    toast('播放失败：' + (err.message || err));
  }
}

function togglePlay() {
  if (!audio.src) return;
  if (audio.paused) audio.play(); else audio.pause();
}

audio.addEventListener('play', () => { $('btnPlay').textContent = '⏸'; });
audio.addEventListener('pause', () => { $('btnPlay').textContent = '▶️'; });
audio.addEventListener('ended', () => playIndex((currentIndex + 1) % playlist.length));
audio.addEventListener('timeupdate', () => {
  $('npCur').textContent = fmtTime(audio.currentTime);
  $('npFill').style.width = (audio.duration ? audio.currentTime / audio.duration * 100 : 0) + '%';
});
audio.addEventListener('loadedmetadata', () => {
  $('npDur').textContent = fmtTime(audio.duration);
});

// ---------- 锁屏 / 后台控制（Media Session）----------
function setupMediaSession(song) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artist || 'MyMusic',
    album: 'MyMusic 离线',
    artwork: song.thumb ? [{ src: song.thumb, sizes: '512x512' }] : []
  });
  navigator.mediaSession.setActionHandler('play', () => audio.play());
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('previoustrack', () => playIndex((currentIndex - 1 + playlist.length) % playlist.length));
  navigator.mediaSession.setActionHandler('nexttrack', () => playIndex((currentIndex + 1) % playlist.length));
}

// ---------- 本地导入 ----------
uploadBox.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async e => {
  const files = [...e.target.files];
  if (!files.length) return;
  let ok = 0;
  for (const f of files) {
    const meta = await readMeta(f);
    const song = {
      id: genId(),
      title: meta.title || f.name.replace(/\.[^.]+$/, ''),
      artist: meta.artist || '',
      duration: meta.duration || 0,
      thumb: '',
      blob: f,
      source: 'local',
      addedAt: Date.now()
    };
    await putSong(song);
    ok++;
  }
  fileInput.value = '';
  toast(`已导入 ${ok} 首`);
  await loadLibrary();
});

function readMeta(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = 'metadata';
    a.src = url;
    a.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ title: '', artist: '', duration: a.duration });
    };
    a.onerror = () => { URL.revokeObjectURL(url); resolve({ title: '', artist: '', duration: 0 }); };
  });
}

// ---------- 搜索 & 下载 ----------
$('searchBtn').addEventListener('click', doSearch);
$('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

async function doSearch() {
  const q = $('searchInput').value.trim();
  if (!q) return;
  dlStatus.className = 'dl-status show';
  dlStatus.innerHTML = '<span class="spinner"></span>搜索中…';
  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    renderDlResults(data.results || []);
    dlStatus.className = 'dl-status';
  } catch (err) {
    dlStatus.innerHTML = '⚠️ 无法连接下载服务。请确认后端已启动（电脑上运行 start_server.bat），且手机与电脑同一 WiFi。';
  }
}

async function downloadTrack(r) {
  const btn = dlList.querySelector('.dl-btn');
  // 找到对应按钮
  const divs = [...dlList.querySelectorAll('.song')];
  const idx = divs.findIndex(d => d.querySelector('.title').textContent === r.title);
  const target = divs[idx] ? divs[idx].querySelector('.dl-btn') : btn;
  target.textContent = '⏳';
  dlStatus.className = 'dl-status show';
  dlStatus.innerHTML = '<span class="spinner"></span>正在下载并转 MP3，歌曲时长等一会…';
  try {
    const res = await fetch(`${API_BASE}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: r.url })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '下载失败');
    const mp3Blob = await fetch(data.mp3).then(r2 => r2.blob());
    const song = {
      id: genId(),
      title: data.title || r.title,
      artist: data.artist || r.artist || '',
      duration: data.duration || r.duration || 0,
      thumb: data.thumb || r.thumb || '',
      blob: mp3Blob,
      source: 'youtube',
      addedAt: Date.now()
    };
    await putSong(song);
    target.textContent = '✅';
    dlStatus.className = 'dl-status';
    toast('已保存到「我的音乐」');
    await loadLibrary();
  } catch (err) {
    target.textContent = '⬇️';
    dlStatus.innerHTML = '⚠️ 下载失败：' + (err.message || err);
  }
}

// ---------- 删除 ----------
libList.addEventListener('click', async e => {
  const btn = e.target.closest('[data-del]');
  if (!btn) return;
  const i = +btn.dataset.del;
  const song = playlist[i];
  if (audio.src && i === currentIndex) { audio.pause(); audio.src = ''; }
  await deleteSong(song.id);
  toast('已删除');
  await loadLibrary();
});

// ---------- 设置弹窗 ----------
$('gearBtn').addEventListener('click', () => {
  $('apiBaseInput').value = localStorage.getItem('apiBase') || '';
  $('settingsModal').classList.add('show');
});
$('saveApiBtn').addEventListener('click', () => {
  const v = $('apiBaseInput').value.trim().replace(/\/+$/, '');
  if (v) localStorage.setItem('apiBase', v);
  else localStorage.removeItem('apiBase');
  API_BASE = localStorage.getItem('apiBase') || location.origin;
  $('settingsModal').classList.remove('show');
  toast('已保存');
});
$('resetApiBtn').addEventListener('click', () => {
  localStorage.removeItem('apiBase');
  API_BASE = location.origin;
  $('settingsModal').classList.remove('show');
  toast('已恢复默认');
});
$('settingsModal').addEventListener('click', e => {
  if (e.target === $('settingsModal')) $('settingsModal').classList.remove('show');
});

// ---------- 初始化 ----------
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.querySelectorAll('main section').forEach(x => x.classList.remove('active'));
    $(t.dataset.tab).classList.add('active');
  });
});

$('btnPlay').addEventListener('click', togglePlay);
$('btnPrev').addEventListener('click', () => playIndex((currentIndex - 1 + playlist.length) % playlist.length));
$('btnNext').addEventListener('click', () => playIndex((currentIndex + 1) % playlist.length));

// 锁屏切歌时同步
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('seekto', d => { if (d.seekTime) audio.currentTime = d.seekTime; });
}

async function loadLibrary() {
  playlist = await getAllSongs();
  renderLibrary();
}

(async function init() {
  try {
    await openDB();
    await loadLibrary();
  } catch (err) {
    console.error(err);
    libList.innerHTML = '<div class="empty">存储初始化失败</div>';
  }
  // 注册离线缓存（PWA 必需）
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (err) { console.warn('SW 注册失败', err); }
  }
})();
