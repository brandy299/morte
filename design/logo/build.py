"""
Builds the Pult logo masters from exact geometry (15 degree desk slope).
Run: python3 design/logo/build.py   (writes the SVG masters next to this file)
The idea: the lowercase p is a desk seen from the side. Its bowl is the sloped desk top, its stem the leg.
"""
import math
from pathlib import Path

OUT = Path(__file__).parent
T = math.tan(math.radians(15))
COS = math.cos(math.radians(15))
INK, ACCENT, PAPER = "#23201b", "#b4532a", "#f4efe6"


def f(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def desk_p(x0, top, bowl_w, bowl_h, desc, w, rr):
    """The p: sloped top, bowl with a rounded lower right corner, stem down to `desc`. One path with a real hole."""
    right, bottom = x0 + bowl_w, top + bowl_h
    y_at = lambda x: top + (x - x0) * T
    outer = (f"M{f(x0)} {f(top)} L{f(right)} {f(y_at(right))} L{f(right)} {f(bottom - rr)} "
             f"A{f(rr)} {f(rr)} 0 0 1 {f(right - rr)} {f(bottom)} L{f(x0 + w)} {f(bottom)} "
             f"L{f(x0 + w)} {f(desc)} L{f(x0)} {f(desc)} Z")
    off = w / COS
    hx0, hx1, hb, ri = x0 + w, right - w, bottom - w, max(rr - w, 0.01)
    hole = (f"M{f(hx0)} {f(y_at(hx0) + off)} L{f(hx0)} {f(hb)} L{f(hx1 - ri)} {f(hb)} "
            f"A{f(ri)} {f(ri)} 0 0 0 {f(hx1)} {f(hb - ri)} L{f(hx1)} {f(y_at(hx1) + off)} Z")
    return f"{outer} {hole}"


def poly(pts):
    return "M" + " L".join(f"{f(x)} {f(y)}" for x, y in pts) + " Z"


def stem(x, top, bottom, w):
    """Vertical stroke whose top is cut at the desk slope (left end higher)."""
    return poly([(x, top), (x + w, top + w * T), (x + w, bottom), (x, bottom)])


def bowl_bottom(cx, cy, r_out, r_in, extra=2):
    """Lower half ring for the u, slightly overlapping the stems so no seam shows."""
    return (f"M{f(cx - r_out)} {f(cy - extra)} L{f(cx - r_out)} {f(cy)} A{f(r_out)} {f(r_out)} 0 0 0 {f(cx + r_out)} {f(cy)} "
            f"L{f(cx + r_out)} {f(cy - extra)} L{f(cx + r_in)} {f(cy - extra)} L{f(cx + r_in)} {f(cy)} "
            f"A{f(r_in)} {f(r_in)} 0 0 1 {f(cx - r_in)} {f(cy)} L{f(cx - r_in)} {f(cy - extra)} Z")


# ---------- Symbol ----------
BW, BH, DL, RR = 154, 142, 58, 76      # bowl width, bowl height, descender length, corner radius (scale 1)


def symbol(w=38, scale=1.0, left=None, top=None):
    """Without `left`/`top` the symbol is centred on a 256 canvas, a little above the middle (optical centre)."""
    bw, bh, dl, rr, w = BW * scale, BH * scale, DL * scale, RR * scale, w * scale
    height = bh + dl
    x0 = 128 - bw / 2 if left is None else left
    y0 = 128 - height / 2 - 3 * scale if top is None else top
    return desk_p(x0, y0, bw, bh, y0 + height, w, rr)


# ---------- Wordmark "pult" on a 256-high canvas ----------
S = 30                    # stroke
XH_TOP, BASE = 92, 204    # x-height band
ASC, DESC = 36, 248
R = 54                    # outer radius of the u


def wordmark(x=0.0):
    parts = []
    xh = BASE - XH_TOP
    # p: same drawing as the symbol, at wordmark size
    bw = 116
    parts.append(desk_p(x, XH_TOP, bw, xh, DESC, S, 50))
    x += bw + 22
    # u
    cy = BASE - R
    parts.append(stem(x, XH_TOP, cy + 2, S))
    parts.append(stem(x + 2 * R - S, XH_TOP, BASE, S))
    parts.append(bowl_bottom(x + R, cy, R, R - S))
    x += 2 * R + 24
    # l
    parts.append(stem(x, ASC, BASE, S))
    x += S + 22
    # t: stem plus a crossbar that follows the slope
    tx = x + 14
    parts.append(stem(tx, ASC + 22, BASE, S))
    bl, br, by, bt = x, tx + S + 24, XH_TOP, 24
    parts.append(poly([(bl, by), (br, by + (br - bl) * T), (br, by + (br - bl) * T + bt), (bl, by + bt)]))
    return parts, br


def paths(parts, fill):
    return "".join(f'<path fill="{fill}" fill-rule="evenodd" d="{p}"/>' for p in parts)


def shift_path(d, dx, dy):
    import re
    toks = re.findall(r"[MLAZ]|-?\d+(?:\.\d+)?", d)
    out, i, cmd = [], 0, None
    while i < len(toks):
        t = toks[i]
        if t in "MLAZ":
            cmd = t
            out.append(t)
            i += 1
            continue
        if cmd == "A":
            out += toks[i:i + 5]
            i += 5
        out += [f(float(toks[i]) + dx), f(float(toks[i + 1]) + dy)]
        i += 2
    return " ".join(out)


def write(name, w, h, body, title, y0=0):
    (OUT / name).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {f(y0)} {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}" '
        f'role="img" aria-labelledby="title"><title id="title">{title}</title>{body}</svg>\n')


if __name__ == "__main__":
    for old in OUT.glob("*.svg"):
        old.unlink()
    write("pult-zeichen.svg", 256, 256, paths([symbol()], ACCENT), "Pult")
    # Small cut for 16 to 32 px: heavier stroke, larger on the canvas, so the counter stays open.
    write("pult-zeichen-klein.svg", 256, 256, paths([symbol(w=44, scale=1.12)], ACCENT), "Pult")
    # Reversed: white looks heavier on dark ground, so the stroke is a little thinner.
    write("pult-zeichen-hell.svg", 256, 256, paths([symbol(w=35)], PAPER), "Pult")

    # The logo is the wordmark itself: its p is the symbol, in the accent colour.
    # (Symbol next to the wordmark would read "Ppult".) Cropped to ascender..descender.
    wm, wm_w = wordmark()
    h = DESC - ASC
    write("pult-logo.svg", wm_w, h, paths(wm[:1], ACCENT) + paths(wm[1:], INK), "Pult", y0=ASC)
    write("pult-logo-einfarbig.svg", wm_w, h, paths(wm, INK), "Pult", y0=ASC)
    write("pult-logo-hell.svg", wm_w, h, paths(wm[:1], ACCENT) + paths(wm[1:], PAPER), "Pult", y0=ASC)
    print("ok")
