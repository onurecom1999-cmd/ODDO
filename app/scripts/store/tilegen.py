# Draws a dark street-map-like tile (512px, @2x) for z/x/y, continuous across tiles. Offline stand-in for CARTO dark.
import sys, math, random
from PIL import Image, ImageDraw
z, x, y, out = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
N = 256 * 2 ** z
def wy(lat):
    r = math.radians(lat); return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * N
def wx(lon): return (lon + 180) / 360 * N
x0, y0 = x * 256, y * 256
img = Image.new('RGB', (512, 512), (24, 24, 23)); d = ImageDraw.Draw(img)
P = lambda X, Y: ((X - x0) * 2, (Y - y0) * 2)
f = 2 ** (z - 16)
coast = wy(35.3485)
# sea
pts = [P(X, coast + 22 * f * math.sin(X / (90 * f)) + 9 * f * math.sin(X / (23 * f))) for X in range(x0 - 4, x0 + 262, 2)]
d.polygon([P(x0 - 4, y0 - 4)] + pts + [P(x0 + 262, y0 - 4)], fill=(14, 17, 21))
S = 70 * f
def lines(a0, a1, salt):
    k0, k1 = int(a0 // S) - 1, int(a1 // S) + 2
    for k in range(k0, k1):
        rnd = random.Random(k * 7919 + salt)
        yield k, k * S + rnd.uniform(-S * .3, S * .3), rnd
for k, X, r in lines(x0, x0 + 256, 1):
    w = 5 if k % 6 == 0 else 2
    d.line([P(X + r.uniform(-8, 8) * f, y0 - 10), P(X + r.uniform(-8, 8) * f, y0 + 266)], fill=(46, 46, 44) if w == 2 else (60, 60, 57), width=w)
for k, Y, r in lines(y0, y0 + 256, 2):
    w = 5 if k % 5 == 0 else 2
    d.line([P(x0 - 10, Y + r.uniform(-6, 6) * f), P(x0 + 266, Y + r.uniform(-6, 6) * f)], fill=(46, 46, 44) if w == 2 else (60, 60, 57), width=w)
# coast road
d.line(pts[::1], fill=(64, 64, 60), width=6)
# re-cover sea over streets
d.polygon([P(x0 - 4, y0 - 4)] + [(a, b - 4) for a, b in pts] + [P(x0 + 262, y0 - 4)], fill=(14, 17, 21))
img.save(out)
