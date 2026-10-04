import math
INK='#16202A'; CHALK='#2456D3'; TAPE='#F2C230'; BG='#ECEFED'
def pt(cx,cy,r,deg): a=math.radians(deg); return cx+r*math.cos(a), cy+r*math.sin(a)

# A — "Snap": a C drawn like a chalk-line reel; its bottom stroke runs out as a dead-straight line.
def mark_snap(ink=INK, accent=CHALK, dot=TAPE):
    cx,cy,r,sw=38,50,26,13
    x1,y1=pt(cx,cy,r,-48)          # top-right terminal
    # arc counter-clockwise (through top, left) to bottom point (cx, cy+r)
    arc=f'M{x1:.2f} {y1:.2f} A{r} {r} 0 1 0 {cx} {cy+r}'
    line=f'M{cx} {cy+r} L74 {cy+r}'
    return (f'<path d="{arc}" fill="none" stroke="{ink}" stroke-width="{sw}" stroke-linecap="butt"/>'
            f'<path d="{line}" fill="none" stroke="{accent}" stroke-width="{sw}" stroke-linecap="butt"/>'
            f'<rect x="79" y="{cy+r-sw/2}" width="5" height="{sw}" fill="{accent}"/>'
            f'<rect x="88" y="{cy+r-sw/2}" width="3" height="{sw}" fill="{accent}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="6.5" fill="{dot}"/>')

# B — "Straight to paid": the chalk line runs level, then drops and rises into a tick.
def mark_tick(ink=INK, accent=CHALK, dot=TAPE):
    sw=13
    return (f'<path d="M8 54 H16 M22 54 H30 M36 54 H44" stroke="{accent}" stroke-width="{sw}" fill="none"/>'
            f'<path d="M44 54 L58 68 L92 26" stroke="{ink}" stroke-width="{sw}" fill="none" stroke-linejoin="miter" stroke-miterlimit="10"/>')

# C — "Plumb": a plumb bob on its line. The bob's cut-out is a level line: true vertical meets true horizontal.
def mark_plumb(ink=INK, accent=CHALK, dot=TAPE):
    return (f'<rect x="46.5" y="6" width="7" height="30" fill="{accent}"/>'
            f'<path d="M50 30 L76 58 L50 96 L24 58 Z" fill="{ink}"/>'
            f'<rect x="24" y="55" width="52" height="7" fill="{dot}"/>')

# D — "Reel": the case of a chalk reel with its line pulled out (evolution of the current app icon).
def mark_reel(ink=INK, accent=CHALK, dot=TAPE):
    return (f'<rect x="6" y="22" width="56" height="56" rx="14" fill="{dot}"/>'
            f'<circle cx="34" cy="50" r="12" fill="{ink}"/>'
            f'<circle cx="34" cy="50" r="4.5" fill="{dot}"/>'
            f'<path d="M62 50 H72 M78 50 H85 M90 50 H95" stroke="{accent}" stroke-width="7" fill="none"/>')

MARKS={'snap':mark_snap,'tick':mark_tick,'plumb':mark_plumb,'reel':mark_reel}
def svg(inner, vb='0 0 100 100', w=None, h=None, bg=None):
    rect=f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ''
    size=(f' width="{w}"' if w else '')+(f' height="{h}"' if h else '')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{size}>{rect}{inner}</svg>'
