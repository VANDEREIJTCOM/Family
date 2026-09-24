from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BLUE = "#2E6CA5"
YELLOW = "#FFDD00"
WHITE = "#FFFFFF"

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "vandereijt_family_hub"


def font(size, bold=True):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def molecule(draw, box, background=None):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    if background:
        draw.rounded_rectangle(box, radius=int(min(w, h) * 0.20), fill=background)

    # Geometry follows the supplied VANDEREIJT.COM molecule mark:
    # large centre, large lower-left node, medium upper nodes, small lower-right.
    pts = {
        "tl": (0.27, 0.25, 0.105),
        "tr": (0.74, 0.32, 0.090),
        "bl": (0.35, 0.78, 0.125),
        "c":  (0.55, 0.50, 0.150),
        "br": (0.75, 0.67, 0.060),
    }

    def xy(px, py):
        return x0 + px * w, y0 + py * h

    width = max(2, int(min(w, h) * 0.040))
    for source, target in (("tl", "c"), ("tr", "c"), ("bl", "c"), ("br", "c")):
        draw.line([xy(*pts[source][:2]), xy(*pts[target][:2])], fill=YELLOW, width=width)

    for px, py, pr in pts.values():
        cx, cy = xy(px, py)
        r = pr * min(w, h)
        draw.ellipse((cx-r, cy-r, cx+r, cy+r), fill=YELLOW)


# Home Assistant app icon: recommended 128x128.
icon = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
molecule(ImageDraw.Draw(icon), (0, 0, 127, 127), BLUE)
icon.save(APP / "icon.png", optimize=True)
icon.save(APP / "static" / "brand-icon.png", optimize=True)


# Home Assistant app logo: recommended around 250x100.
# This is the full VANDEREIJT.COM website branding, as requested.
logo = Image.new("RGBA", (250, 100), WHITE)
draw = ImageDraw.Draw(logo)
draw.rounded_rectangle((2, 6, 248, 94), radius=13, fill=BLUE)
molecule(draw, (10, 15, 74, 85), None)

wordmark = "VANDEREIJT.COM"
tagline = "development & consultancy"

word_font = font(24, True)
tag_font = font(10, True)

# Keep the full wordmark inside the compact HA logo area.
max_width = 162
while draw.textbbox((0, 0), wordmark, font=word_font)[2] > max_width and word_font.size > 12:
    word_font = font(word_font.size - 1, True)

x = 78
draw.text((x, 26), wordmark, font=word_font, fill=WHITE)

tag_box = draw.textbbox((0, 0), tagline, font=tag_font)
tag_width = tag_box[2] - tag_box[0]
draw.text((x + max(0, (162 - tag_width) // 2), 57), tagline, font=tag_font, fill=WHITE)

logo.save(APP / "logo.png", optimize=True)
# Generated from the supplied VANDEREIJT.COM branding reference.\nprint("Generated Home Assistant branding assets for Family Hub 0.5.1")
