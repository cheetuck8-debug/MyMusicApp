"""Generate MyMusic app icons (192 & 512) — pure stdlib (zlib + struct), no PIL needed."""
import struct, zlib


def write_png(path, w, h, rgba_rows):
    """rgba_rows: list of rows, each a bytes object of length w*4 (RGBA)."""
    raw = b"".join(b"\x00" + row for row in rgba_rows)  # filter 0 per scanline
    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))  # 8-bit RGBA
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def make_icon(size):
    px = [[(0, 0, 0, 0) for _ in range(size)] for _ in range(size)]
    w = size / 100.0
    r = int(size * 0.22)

    def in_rounded_rect(x, y):
        # rounded-rect bounds check (corner radius r)
        if r <= x < size - r or r <= y < size - r:
            return True
        # corner circles
        cx = r if x < size / 2 else size - 1 - r
        cy = r if y < size / 2 else size - 1 - r
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

    def fill_ellipse(cx, cy, rx, ry, color):
        x0, x1 = int(cx - rx), int(cx + rx) + 1
        y0, y1 = int(cy - ry), int(cy + ry) + 1
        for yy in range(max(0, y0), min(size, y1)):
            for xx in range(max(0, x0), min(size, x1)):
                if ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1:
                    px[yy][xx] = color

    def fill_rect(x0, y0, x1, y1, color):
        for yy in range(max(0, int(y0)), min(size, int(y1) + 1)):
            for xx in range(max(0, int(x0)), min(size, int(x1) + 1)):
                px[yy][xx] = color

    # gradient background inside rounded rect
    for yy in range(size):
        t = yy / (size - 1)
        color = (int(255 * (1 - t * 0.35)), int(77 + 66 * t), int(61 + 20 * t), 255)
        for xx in range(size):
            if in_rounded_rect(xx, yy):
                px[yy][xx] = color

    WHITE = (255, 255, 255, 255)
    cx, cy = size * 0.5, size * 0.52
    head_r = 9.2 * w
    # noteheads
    fill_ellipse(cx - 12 * w, cy + 4 * w, head_r, head_r * 0.82, WHITE)
    fill_ellipse(cx + 12 * w, cy + 4 * w, head_r, head_r * 0.82, WHITE)
    # stems
    stem_w = max(2.4, 3.4 * w)
    l_stem_x = cx - 12 * w + head_r * 0.42 - stem_w / 2
    r_stem_x = cx + 12 * w + head_r * 0.42 - stem_w / 2
    fill_rect(l_stem_x, cy - 40 * w, l_stem_x + stem_w, cy + 4 * w + head_r * 0.3, WHITE)
    fill_rect(r_stem_x, cy - 40 * w, r_stem_x + stem_w, cy + 4 * w + head_r * 0.3, WHITE)
    # beam
    fill_rect(l_stem_x, cy - 44 * w, r_stem_x + stem_w, cy - 44 * w + 7.5 * w, WHITE)

    rows = [bytes(v for p in row for v in p) for row in px]
    write_png(f"icon-{size}.png", size, size, rows)
    print(f"icon-{size}.png saved")


for s in (192, 512):
    make_icon(s)
