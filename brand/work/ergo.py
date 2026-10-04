import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from wordmark import text_path, inst
INK='#16202A'; CHALK='#2456D3'; TAPE='#F2C230'; BG='#ECEFED'; WHITE='#FFFFFF'; CHALK_L='#7FA1F6'
OUT='/home/claude/chalkline/brand/ergo'; os.makedirs(OUT, exist_ok=True)
def svg(inner, vb, title='Ergo'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{title}"><title>{title}</title>{inner}</svg>'

# ---------- the e ----------
# Archivo's own lowercase e at the wordmark weight. Its crossbar (font units x 226-727, y 228-324)
# becomes the chalk line: blue, and in the symbol it runs on past the letter and breaks into chalk dashes.
SIZE=100
E_D, E_B, E_ADV = text_path('e', 125, 760, -20, SIZE)
RGO_D, RGO_B, RGO_ADV = text_path('rgo', 125, 760, -20, SIZE)
ERGO_D, ERGO_B, ERGO_ADV = text_path('ergo', 125, 760, -20, SIZE)
BAR_X0, BAR_X1, BAR_Y0, BAR_Y1 = 22.6, 72.7, -32.4, -22.8      # px at SIZE (y negative = up)
BAR_H = BAR_Y1 - BAR_Y0
_cid = [0]
def e_glyph(ink, line, run_to=None, dashes=None, fleck=None):
    _cid[0] += 1; cid = f'bar{_cid[0]}'
    end = run_to if run_to is not None else BAR_X1 + 0.6
    s = f'<path d="{E_D}" fill="{ink}"/>'
    # the bar inside the letter: the glyph clipped to the bar band, painted blue
    s += f'<clipPath id="{cid}"><rect x="{BAR_X0}" y="{BAR_Y0}" width="{BAR_X1 - BAR_X0 + 1}" height="{BAR_H}"/></clipPath>'
    s += f'<path d="{E_D}" fill="{line}" clip-path="url(#{cid})"/>'
    if run_to is not None:
        s += f'<rect x="{BAR_X1 - 0.5}" y="{BAR_Y0}" width="{end - BAR_X1 + 0.5:.2f}" height="{BAR_H}" fill="{line}"/>'
    for k, (x, w) in enumerate(dashes or []):
        col = fleck if (fleck and k == len(dashes) - 1) else line
        s += f'<rect x="{x}" y="{BAR_Y0}" width="{w}" height="{BAR_H}" fill="{col}"/>'
    return s

def mark(ink=INK, line=CHALK, fleck=TAPE, dashes=True):
    if not dashes: return e_glyph(ink, line)
    return e_glyph(ink, line, run_to=96, dashes=[(102, 8), (115, 5)], fleck=fleck)
MARK_VB = (E_B[0] - 4, E_B[1] - 4, 120 + 4 - (E_B[0] - 4), E_B[3] - E_B[1] + 8)

def lt_inner(ink=INK, line=CHALK):
    """Logotype: ergo, with the e's crossbar in chalk blue."""
    rgo = f'<g transform="translate({E_ADV - 2:.3f},0)"><path d="{RGO_D}" fill="{ink}"/></g>'
    return e_glyph(ink, line) + rgo, E_ADV - 2 + RGO_B[2]

TOP = -max(-E_B[1], -RGO_B[1])
def logotype_svg(ink=INK, line=CHALK):
    inner, total = lt_inner(ink, line); pad = 6
    return svg(inner, f'{-pad} {TOP - pad:.2f} {total + 2 * pad:.2f} {RGO_B[3] - TOP + 2 * pad:.2f}')

def signature(ink=INK, line=CHALK, fleck=TAPE):
    """Logotype whose chalk line carries on after the last letter, at the height of the e's bar."""
    inner, total = lt_inner(ink, line)
    x = total + 10
    tail = (f'<rect x="{x:.2f}" y="{BAR_Y0}" width="34" height="{BAR_H}" fill="{line}"/>'
            f'<rect x="{x + 40:.2f}" y="{BAR_Y0}" width="9" height="{BAR_H}" fill="{line}"/>'
            f'<rect x="{x + 55:.2f}" y="{BAR_Y0}" width="5" height="{BAR_H}" fill="{fleck}"/>')
    end = x + 60; pad = 6
    return svg(inner + tail, f'{-pad} {TOP - pad:.2f} {end + 2 * pad:.2f} {RGO_B[3] - TOP + 2 * pad:.2f}')

def stacked(ink=INK, line=CHALK, fleck=TAPE):
    mx0, my0, mw, mh = MARK_VB; inner, total = lt_inner(ink, line)
    sc = total / mw * 0.85
    m = f'<g transform="translate({(total - mw * sc) / 2:.2f},0) scale({sc:.4f}) translate({-mx0},{-my0})">{mark(ink, line, fleck)}</g>'
    y = mh * sc + 34 - TOP; pad = 8
    return svg(m + f'<g transform="translate(0,{y:.2f})">{inner}</g>', f'{-pad} {-pad} {total + 2 * pad:.2f} {y + RGO_B[3] + 2 * pad:.2f}')

def mark_svg(ink=INK, line=CHALK, fleck=TAPE):
    x, y, w, h = MARK_VB
    return svg(mark(ink, line, fleck), f'{x:.2f} {y:.2f} {w:.2f} {h:.2f}')

def app_icon(bg=CHALK, ink=WHITE, line=TAPE, r=22.5):
    w = E_B[2] - E_B[0]; h = E_B[3] - E_B[1]
    sc = 56 / w
    tx = (100 - w * sc) / 2 - E_B[0] * sc; ty = (100 - h * sc) / 2 - E_B[1] * sc
    return svg(f'<rect width="100" height="100" rx="{r}" fill="{bg}"/><g transform="translate({tx:.2f},{ty:.2f}) scale({sc:.4f})">{e_glyph(ink, line)}</g>', '0 0 100 100')

def wordmark_plain(fill=INK):
    pad = 6
    return svg(f'<path d="{ERGO_D}" fill="{fill}"/>', f'{-pad} {ERGO_B[1] - pad:.2f} {ERGO_B[2] + 2 * pad:.2f} {ERGO_B[3] - ERGO_B[1] + 2 * pad:.2f}')

files={
 'ergo-logo.svg': logotype_svg(),
 'ergo-logo-white.svg': logotype_svg(WHITE, CHALK_L),
 'ergo-logo-black.svg': logotype_svg(INK, INK),
 'ergo-signature.svg': signature(),
 'ergo-signature-white.svg': signature(WHITE, CHALK_L, TAPE),
 'ergo-wordmark.svg': wordmark_plain(),
 'ergo-stacked.svg': stacked(),
 'ergo-stacked-white.svg': stacked(WHITE, CHALK_L, TAPE),
 'ergo-mark.svg': mark_svg(),
 'ergo-mark-white.svg': mark_svg(WHITE, CHALK_L, TAPE),
 'ergo-mark-black.svg': mark_svg(INK, INK, INK),
 'ergo-app-icon.svg': app_icon(),
 'ergo-app-icon-dark.svg': app_icon(INK, WHITE, CHALK_L),
 'ergo-app-icon-light.svg': app_icon(BG, INK, CHALK),
}
for n,s in files.items(): open(f'{OUT}/{n}','w').write(s)
print('ok', len(files))
