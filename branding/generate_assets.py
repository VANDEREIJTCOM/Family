from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BLUE = "#2E6CA5"
YELLOW = "#FFDD00"
DARK = "#0A1628"
WHITE = "#FFFFFF"
LIGHT = "#6B7A8C"

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
        draw.rounded_rectangle(box, radius=int(min(w, h) * .20), fill=background)
    pts = {
        "a": (.26, .26, .10),
        "b": (.74, .32, .085),
        "c": (.43, .74, .13),
        "d": (.58, .49, .15),
        "e": (.72, .61, .06),
    }
    def xy(px, py):
        return x0 + px*w, y0 + py*h
    width = max(2, int(min(w, h) * .045))
    for source, target in (("a","d"),("b","d"),("c","d"),("e","d")):
        draw.line([xy(*pts[source][:2]), xy(*pts[target][:2])], fill=YELLOW, width=width)
    for px, py, pr in pts.values():
        cx, cy = xy(px, py)
        r = pr * min(w, h)
        draw.ellipse((cx-r, cy-r, cx+r, cy+r), fill=YELLOW)

icon = Image.new("RGBA", (128, 128), (0,0,0,0))
molecule(ImageDraw.Draw(icon), (0,0,127,127), BLUE)
icon.save(APP / "icon.png")
icon.save(APP / "static" / "brand-icon.png")

banner = Image.new("RGBA", (1000, 240), WHITE)
draw = ImageDraw.Draw(banner)
molecule(draw, (36, 28, 196, 188), BLUE)
draw.text((230, 38), "VANDEREIJT.COM", font=font(24, True), fill=BLUE)
draw.text((230, 60), "Family Hub", font=font(52, True), fill=DARK)
draw.text((230, 126), "for Home Assistant", font=font(28, False), fill=LIGHT)
banner.save(APP / "logo.png")
print("Generated Home Assistant branding assets for Family Hub 0.5.0")
