import math, os
from wordmark import wordmark
INK='#16202A'; CHALK='#2456D3'; TAPE='#F2C230'; BG='#ECEFED'; WHITE='#FFFFFF'; CHALK_L='#7FA1F6'
OUT='/home/claude/chalkline/brand/logo'; os.makedirs(OUT, exist_ok=True)

# ---- primary mark: "Snap" ----
# A C drawn as a chalk-line reel (ring + hub). Its lower stroke leaves the ring as a dead-straight line
# that breaks into chalk dashes: the line snapped on site, and the straight path from quote to paid.
CX, CY, R, SW = 38, 50, 26, 13
def snap(ink=INK, line=CHALK, hub=TAPE, dashes=True):
    a=math.radians(-48); x1, y1 = CX+R*math.cos(a), CY+R*math.sin(a)
    yb=CY+R
    s=(f'<path d="M{x1:.3f} {y1:.3f}A{R} {R} 0 1 0 {CX} {yb}" fill="none" stroke="{ink}" stroke-width="{SW}"/>'
       f'<path d="M{CX-0.5} {yb}H70" fill="none" stroke="{line}" stroke-width="{SW}"/>')
    if dashes:
        s+=f'<path d="M77 {yb}h8M91 {yb}h5" fill="none" stroke="{line}" stroke-width="{SW}"/>'
    s+=f'<circle cx="{CX}" cy="{CY}" r="6.5" fill="{hub}"/>'
    return s
MARK_BOX=(CX-R-SW/2, CY-R-SW/2, 96, CY+R+SW/2)   # x0,y0,x1,y1 of drawn content

WD, WB, WADV, WDOTS = wordmark()
def word(fill=INK, dot=CHALK):
    x0,y0,x1,y1 = WDOTS[0][0], -72.4413, WDOTS[0][2], -60.3496
    return f'<path d="{WD}" fill="{fill}"/><rect x="{x0:.3f}" y="{y0:.3f}" width="{x1-x0:.3f}" height="{y1-y0:.3f}" fill="{dot}"/>'

def svg(inner, vb, w=None, h=None, title='Chalkline'):
    size=(f' width="{w}"' if w else '')+(f' height="{h}"' if h else '')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{size} role="img" aria-label="{title}"><title>{title}</title>{inner}</svg>'

def horiz(ink=INK, line=CHALK, hub=TAPE, wfill=None, wdot=None):
    """Mark + wordmark. The mark's chalk line sits on the wordmark baseline; its stroke matches the letter stems."""
    mx0,my0,mx1,my1=MARK_BOX
    sc=1.5                                    # symbol ~1.3x the letter height; stroke a touch heavier than the stems
    yb=CY+R                                   # centre of chalk line in mark units
    top=-(yb-my0)*sc; bottom=(my1-yb)*sc
    mark=f'<g transform="scale({sc}) translate({-mx0},{-yb})">{snap(ink,line,hub)}</g>'
    mw=(mx1-mx0)*sc; gap=14
    w=f'<g transform="translate({mw+gap:.2f},{bottom*0.0:.2f})">{word(wfill or ink, wdot or line)}</g>'
    total=mw+gap+WB[2]; pad=8
    return svg(mark+w, f'{-pad} {top-pad:.2f} {total+2*pad:.2f} {bottom-top+2*pad:.2f}')

def signature(ink=INK, line=CHALK, hub=TAPE, wfill=None, wdot=None):
    """Marketing lockup: the reel's line runs on under the whole wordmark (no descenders), then snaps into chalk dashes."""
    sw=17; r=40; gap=8                        # absolute units in wordmark space
    ly=gap+sw/2                               # chalk line centre, below the baseline
    cx=r+sw/2; cy=ly-r
    a=math.radians(-48); x1, y1 = cx+r*math.cos(a), cy+r*math.sin(a)
    wx=cx+r*0.62+sw/2+14; end=wx+WB[2]
    body=(f'<path d="M{x1:.2f} {y1:.2f}A{r} {r} 0 1 0 {cx} {ly}" fill="none" stroke="{ink}" stroke-width="{sw}"/>'
          f'<circle cx="{cx}" cy="{cy:.2f}" r="{6.5*sw/13:.2f}" fill="{hub}"/>'
          f'<path d="M{cx-0.5} {ly}H{end-30:.2f}M{end-22:.2f} {ly}h10M{end-6:.2f} {ly}h6" stroke="{line}" stroke-width="{sw}" fill="none"/>'
          f'<g transform="translate({wx:.2f},0)">{word(wfill or ink, wdot or line)}</g>')
    top=cy-r-sw/2; bottom=ly+sw/2; pad=8
    return svg(body, f'{-pad} {top-pad:.2f} {end+2*pad:.2f} {bottom-top+2*pad:.2f}')

def stacked(ink=INK, line=CHALK, hub=TAPE, wfill=None, wdot=None):
    mx0,my0,mx1,my1=MARK_BOX; mw=mx1-mx0; mh=my1-my0
    sc=1.9; ww=WB[2]
    mark=f'<g transform="translate({(ww-mw*sc)/2:.2f},0) scale({sc}) translate({-mx0},{-my0})">{snap(ink,line,hub)}</g>'
    wy=mh*sc+40+72.44
    w=f'<g transform="translate(0,{wy:.2f})">{word(wfill or ink, wdot or line)}</g>'
    pad=10
    return svg(mark+w, f'{-pad} {-pad} {ww+2*pad:.2f} {wy+2*pad+1.2:.2f}')

def mark_only(ink=INK, line=CHALK, hub=TAPE):
    mx0,my0,mx1,my1=MARK_BOX; pad=4
    return svg(snap(ink,line,hub), f'{mx0-pad} {my0-pad} {mx1-mx0+2*pad} {my1-my0+2*pad}')

def wordmark_only(fill=INK, dot=CHALK):
    pad=6
    return svg(word(fill,dot), f'{-pad} {-72.44-pad} {WB[2]+2*pad:.2f} {72.44+2*pad+1.2:.2f}')

def app_icon(bg=CHALK, ink=WHITE, line=TAPE, hub=TAPE, r=22.5):
    # rounded square, mark optically centred (dashes trimmed for small sizes)
    mx0,my0,mx1,my1=CX-R-SW/2, CY-R-SW/2, 74, CY+R+SW/2
    sc=60/(mx1-mx0); w=(mx1-mx0)*sc; h=(my1-my0)*sc
    inner=f'<rect width="100" height="100" rx="{r}" fill="{bg}"/><g transform="translate({(100-w)/2+2:.2f},{(100-h)/2:.2f}) scale({sc:.4f}) translate({-mx0},{-my0})">{snap(ink,line,hub,dashes=False)}</g>'
    return svg(inner,'0 0 100 100')

files={
 'chalkline-logo.svg': horiz(),
 'chalkline-logo-white.svg': horiz(WHITE, CHALK_L, TAPE, WHITE, CHALK_L),
 'chalkline-logo-black.svg': horiz(INK, INK, INK, INK, INK),
 'chalkline-logo-stacked.svg': stacked(),
 'chalkline-signature.svg': signature(),
 'chalkline-signature-white.svg': signature(WHITE, CHALK_L, TAPE, WHITE, CHALK_L),
 'chalkline-logo-stacked-white.svg': stacked(WHITE, CHALK_L, TAPE, WHITE, CHALK_L),
 'chalkline-mark.svg': mark_only(),
 'chalkline-mark-white.svg': mark_only(WHITE, CHALK_L, TAPE),
 'chalkline-mark-black.svg': mark_only(INK, INK, INK),
 'chalkline-wordmark.svg': wordmark_only(),
 'chalkline-app-icon.svg': app_icon(),
 'chalkline-app-icon-dark.svg': app_icon(INK, WHITE, CHALK_L, TAPE),
 'chalkline-app-icon-light.svg': app_icon(BG, INK, CHALK, TAPE),
}
for n,s in files.items(): open(f'{OUT}/{n}','w').write(s)

# ---- alternative directions (explored, not recommended) ----
ALT={
 'tick': f'<path d="M8 54H16M22 54H30M36 54H44" stroke="{CHALK}" stroke-width="13" fill="none"/><path d="M44 54L58 68L92 26" stroke="{INK}" stroke-width="13" fill="none"/>',
 'plumb': f'<rect x="46.5" y="4" width="7" height="30" fill="{CHALK}"/><path d="M50 28L76 57L50 96L24 57Z" fill="{INK}"/><rect x="24" y="54" width="52" height="7" fill="{TAPE}"/>',
 'reel': f'<rect x="6" y="22" width="56" height="56" rx="14" fill="{TAPE}"/><circle cx="34" cy="50" r="12" fill="{INK}"/><circle cx="34" cy="50" r="4.5" fill="{TAPE}"/><path d="M62 50H72M78 50H85M90 50H95" stroke="{CHALK}" stroke-width="7" fill="none"/>',
}
os.makedirs(OUT+'/alternatives', exist_ok=True)
for n,s in ALT.items(): open(f'{OUT}/alternatives/{n}.svg','w').write(svg(s,'0 0 100 100'))
print('wrote', len(files)+len(ALT))

# ---- construction drawing ----
def construction():
    a=math.radians(-48); x1,y1=CX+R*math.cos(a), CY+R*math.sin(a)
    G='#2456D3'; F='#9AA6B2'
    s=f'<rect x="-10" y="-10" width="130" height="120" fill="#FFFFFF"/>'
    # grid
    for i in range(0,101,10):
        s+=f'<path d="M{i} 0V100M0 {i}H100" stroke="#E3E7E4" stroke-width=".3"/>'
    s+=snap()
    s+=f'<circle cx="{CX}" cy="{CY}" r="{R}" fill="none" stroke="{G}" stroke-width=".4" stroke-dasharray="1.2 1"/>'
    s+=f'<circle cx="{CX}" cy="{CY}" r="{R+SW/2}" fill="none" stroke="{F}" stroke-width=".3"/>'
    s+=f'<circle cx="{CX}" cy="{CY}" r="{R-SW/2}" fill="none" stroke="{F}" stroke-width=".3"/>'
    s+=f'<path d="M{CX} {CY}L{CX+38*math.cos(a):.2f} {CY+38*math.sin(a):.2f}" stroke="{G}" stroke-width=".4"/>'
    s+=f'<path d="M0 {CY+R}H100" stroke="{G}" stroke-width=".4" stroke-dasharray="1.2 1"/>'
    s+=f'<path d="M{CX} 4V96" stroke="{F}" stroke-width=".3"/>'
    s+=f'<text x="{CX+30*math.cos(a)+2:.1f}" y="{CY+30*math.sin(a)-3:.1f}" font-family="Archivo,sans-serif" font-size="3.4" fill="{G}">48°</text>'
    s+=f'<text x="2" y="{CY+R-3}" font-family="Archivo,sans-serif" font-size="3.4" fill="{G}">baseline = chalk line</text>'
    s+=f'<text x="{CX+3}" y="{CY+2}" font-family="Archivo,sans-serif" font-size="3.4" fill="{F}">hub ½ stroke</text>'
    for x in (70,77,85,91,96):
        s+=f'<path d="M{x} {CY+R+9}V{CY+R+12}" stroke="{F}" stroke-width=".3"/>'
    s+=f'<text x="70" y="{CY+R+16}" font-family="Archivo,sans-serif" font-size="3.4" fill="{F}">line · 6 · 8 · 6 · 4</text>'
    return svg(s,'-10 -10 130 120')
open(f'{OUT}/../work/construction.svg','w').write(construction())

# ---- alternative lockups ----
def alt_lockup(name):
    m=ALT[name]
    return svg(f'<g transform="translate(0,-86) scale(.95)">{m}</g><g transform="translate(110,0)">{word()}</g>', f'-6 -92 {110+WB[2]+12:.1f} 104')
for n in ALT: open(f'{OUT}/alternatives/{n}-lockup.svg','w').write(alt_lockup(n))
