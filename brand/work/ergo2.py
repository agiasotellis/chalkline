import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from wordmark import text_path, inst
from fontTools.pens.boundsPen import BoundsPen
INK='#16202A'; CHALK='#2456D3'; TAPE='#F2C230'; BG='#ECEFED'; WHITE='#FFFFFF'; CHALK_L='#7FA1F6'
OUT='/home/claude/chalkline/brand/ergo2'; os.makedirs(OUT, exist_ok=True)
def svg(inner, vb, title='Ergo'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{title}"><title>{title}</title>{inner}</svg>'

WD, WB, WADV = text_path('ergo', 125, 760, -30, 100)        # wordmark, x-height ~54, descender ~-? (WB[3] = g bottom)
XH = 54.0

# ---------- A. Therefore (∴) ----------
# Three dots in the logician's "therefore" sign. The two on the ground are the quote and the job;
# the one above is the result: paid. Dot diameter = the wordmark's stem, so mark and letters share one weight.
def therefore(ink=INK, top=CHALK, d=1.0):
    r=13*d; s=34*d                      # dot radius, triangle side (gap = 8, about 0.6 r)
    h=s*math.sqrt(3)/2
    cx=50; base=50+h/2; apex=50-h/2
    return (f'<circle cx="{cx-s/2:.2f}" cy="{base:.2f}" r="{r:.2f}" fill="{ink}"/>'
            f'<circle cx="{cx+s/2:.2f}" cy="{base:.2f}" r="{r:.2f}" fill="{ink}"/>'
            f'<circle cx="{cx:.2f}" cy="{apex:.2f}" r="{r:.2f}" fill="{top}"/>')
_h=34*math.sqrt(3)/2
A_BOX=(50-17-13, 50-_h/2-13, 34+26, _h+26)     # x,y,w,h of the dots

def a_mark(ink=INK, top=CHALK):
    x,y,w,h=A_BOX; p=6
    return svg(therefore(ink, top), f'{x-p:.2f} {y-p:.2f} {w+2*p:.2f} {h+2*p:.2f}')

def word(fill=INK): return f'<path d="{WD}" fill="{fill}"/>'

def a_lockup(ink=INK, top=CHALK, wfill=None):
    x,y,w,h=A_BOX
    sc=XH*1.5/h                          # mark 1.5x x-height, sitting on the baseline
    m=f'<g transform="translate(0,{-h*sc:.2f}) scale({sc:.4f}) translate({-x:.2f},{-y:.2f})">{therefore(ink, top)}</g>'
    gap=16; wx=w*sc+gap
    top_y=min(-h*sc, WB[1]); bot=WB[3]; p=6
    return svg(m+f'<g transform="translate({wx:.2f},0)">{word(wfill or ink)}</g>', f'{-p} {top_y-p:.2f} {wx+WB[2]+2*p:.2f} {bot-top_y+2*p:.2f}')

def a_signature(ink=INK, top=CHALK, wfill=None):
    """ergo∴ : the sign set after the word like a conclusion."""
    x,y,w,h=A_BOX; sc=XH*0.56/h
    m=f'<g transform="translate({WB[2]+8:.2f},{WB[1]:.2f}) scale({sc:.4f}) translate({-x:.2f},{-y:.2f})">{therefore(ink, top)}</g>'
    p=6; end=WB[2]+8+w*sc
    return svg(word(wfill or ink)+m, f'{-p} {WB[1]-p:.2f} {end+2*p:.2f} {WB[3]-WB[1]+2*p:.2f}')

def a_stacked(ink=INK, top=CHALK, wfill=None):
    x,y,w,h=A_BOX; sc=WB[2]*0.32/w
    m=f'<g transform="translate({(WB[2]-w*sc)/2:.2f},0) scale({sc:.4f}) translate({-x:.2f},{-y:.2f})">{therefore(ink, top)}</g>'
    wy=h*sc+46+(-WB[1]); p=8
    return svg(m+f'<g transform="translate(0,{wy:.2f})">{word(wfill or ink)}</g>', f'{-p} {-p} {WB[2]+2*p:.2f} {wy+WB[3]+2*p:.2f}')

def a_icon(bg=CHALK, ink=WHITE, top=TAPE, r=22.5):
    x,y,w,h=A_BOX; sc=50/w
    tx=(100-w*sc)/2-x*sc; ty=(100-h*sc)/2-y*sc+1.5
    return svg(f'<rect width="100" height="100" rx="{r}" fill="{bg}"/><g transform="translate({tx:.2f},{ty:.2f}) scale({sc:.4f})">{therefore(ink, top)}</g>','0 0 100 100')

def wordmark_svg(fill=INK):
    p=6; return svg(word(fill), f'{-p} {WB[1]-p:.2f} {WB[2]+2*p:.2f} {WB[3]-WB[1]+2*p:.2f}')

# ---------- B. On the level ----------
# The o becomes a spirit-level vial with its bubble dead centre: the job is true.
ERG_D, ERG_B, ERG_ADV = text_path('erg', 125, 760, -30, 100)
def font_o():
    f=inst(125,760); gs=f.getGlyphSet(); b=BoundsPen(gs); gs['o'].draw(b); s=0.1
    return [v*s for v in b.bounds]
OX0,OY0,OX1,OY1=font_o()
def b_logo(ink=INK, bubble=CHALK):
    w=OX1-OX0; h=OY1-OY0; x=ERG_ADV-3; y=-OY1; sw=15.5
    vial=(f'<rect x="{x+sw/2:.2f}" y="{y+sw/2:.2f}" width="{w-sw:.2f}" height="{h-sw:.2f}" rx="{(h-sw)/2:.2f}" fill="none" stroke="{ink}" stroke-width="{sw}"/>'
          f'<rect x="{x+w/2-11:.2f}" y="{y+h/2-6.5:.2f}" width="22" height="13" rx="6.5" fill="{bubble}"/>'
          f'<path d="M{x+w/2-17:.2f} {y+sw}V{y+h-sw}M{x+w/2+17:.2f} {y+sw}V{y+h-sw}" stroke="{ink}" stroke-width="3"/>')
    p=6; end=x+w
    return svg(f'<path d="{ERG_D}" fill="{ink}"/>'+vial, f'{-p} {ERG_B[1]-p:.2f} {end+2*p:.2f} {ERG_B[3]-ERG_B[1]+2*p:.2f}')

# ---------- C. Three-step E ----------
# A capital E built from three bars of rising length: quote, job, paid. The last bar is blue.
def c_mark(ink=INK, last=CHALK):
    return (f'<rect x="22" y="20" width="14" height="60" fill="{ink}"/>'
            f'<rect x="22" y="20" width="38" height="14" fill="{ink}"/>'
            f'<rect x="22" y="43" width="30" height="14" fill="{ink}"/>'
            f'<rect x="22" y="66" width="44" height="14" fill="{last}"/>')
def c_logo(ink=INK, last=CHALK):
    rgo_d,rgo_b,_=text_path('rgo',125,760,-30,100)
    sc=XH*1.33/60
    m=f'<g transform="translate(0,{-60*sc:.2f}) scale({sc:.4f}) translate(-22,-20)">{c_mark(ink,last)}</g>'
    x=44*sc+3; p=6
    return svg(m+f'<g transform="translate({x:.2f},0)"><path d="{rgo_d}" fill="{ink}"/></g>', f'{-p} {-60*sc-p:.2f} {x+rgo_b[2]+2*p:.2f} {60*sc+rgo_b[3]+2*p:.2f}')

files={
 'A-mark.svg':a_mark(), 'A-mark-white.svg':a_mark(WHITE, CHALK_L), 'A-mark-black.svg':a_mark(INK, INK),
 'A-lockup.svg':a_lockup(), 'A-lockup-white.svg':a_lockup(WHITE, CHALK_L), 'A-lockup-black.svg':a_lockup(INK, INK),
 'A-signature.svg':a_signature(), 'A-signature-white.svg':a_signature(WHITE, CHALK_L),
 'A-stacked.svg':a_stacked(), 'A-stacked-white.svg':a_stacked(WHITE, CHALK_L),
 'A-icon.svg':a_icon(), 'A-icon-dark.svg':a_icon(INK, WHITE, CHALK_L), 'A-icon-light.svg':a_icon(BG, INK, CHALK),
 'A-wordmark.svg':wordmark_svg(),
 'B-level.svg':b_logo(), 'C-steps.svg':c_logo(),
}
for n,s in files.items(): open(f'{OUT}/{n}','w').write(s)
print('ok', len(files))

# ---------- construction ----------
def construction():
    G='#2456D3'; F='#9AA6B2'; r=13; side=34; h=side*math.sqrt(3)/2
    a=(50,50-h/2); b=(50-side/2,50+h/2); c=(50+side/2,50+h/2)
    g='<rect x="10" y="10" width="80" height="80" fill="#FFFFFF"/>'
    for i in range(10,91,5): g+=f'<path d="M{i} 10V90M10 {i}H90" stroke="#E3E7E4" stroke-width=".25"/>'
    g+=therefore()
    g+=f'<path d="M{a[0]} {a[1]:.2f}L{b[0]} {b[1]:.2f}L{c[0]} {c[1]:.2f}Z" fill="none" stroke="{G}" stroke-width=".35" stroke-dasharray="1 .8"/>'
    for p in (a,b,c): g+=f'<circle cx="{p[0]}" cy="{p[1]:.2f}" r=".9" fill="{G}"/>'
    g+=f'<circle cx="50" cy="{50+h/2-h*2/3+h/2-h/2:.2f}" r="{h*2/3+r:.2f}" fill="none" stroke="{F}" stroke-width=".25"/>'
    g+=f'<path d="M{b[0]+r} {b[1]+r+4:.2f}H{c[0]-r}" stroke="{G}" stroke-width=".35"/><text x="50" y="{b[1]+r+8:.2f}" text-anchor="middle" font-family="Archivo,sans-serif" font-size="2.6" fill="{G}">gap = 0.6 r</text>'
    g+=f'<text x="{c[0]+r+2}" y="{c[1]+1:.2f}" font-family="Archivo,sans-serif" font-size="2.6" fill="{F}">job</text>'
    g+=f'<text x="{b[0]-r-2}" y="{b[1]+1:.2f}" text-anchor="end" font-family="Archivo,sans-serif" font-size="2.6" fill="{F}">quote</text>'
    g+=f'<text x="{a[0]+r+2}" y="{a[1]+1:.2f}" font-family="Archivo,sans-serif" font-size="2.6" fill="{G}">paid</text>'
    g+=f'<text x="50" y="16" text-anchor="middle" font-family="Archivo,sans-serif" font-size="2.6" fill="{F}">equilateral · 3 dots of one size</text>'
    return svg(g,'10 10 80 80')
open(f'{OUT}/A-construction.svg','w').write(construction())
