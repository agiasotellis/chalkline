from marks import *
from wordmark import text_path
d,b,adv=text_path('chalkline',125,760,-20,100)
def lockup(name, ink=INK, accent=CHALK, dot=TAPE, word=None):
    word=word or ink
    m=MARKS[name](ink,accent,dot)
    # mark 100x100 scaled to cap height ~ 1.35x x-height; wordmark baseline aligned
    s=1.0; gap=22
    return f'<g transform="translate(0,0)">{m}</g><g transform="translate({100+gap},{78})"><path d="{d}" fill="{word}"/></g>', 100+gap+adv+6
cells=''
y=0
for i,n in enumerate(MARKS):
    inner,wid=lockup(n)
    cells+=f'<g transform="translate(40,{40+i*170})"><rect x="-20" y="-20" width="160" height="140" rx="16" fill="#fff"/>{MARKS[n]()}<g transform="translate(200,0)">{inner}</g></g>'
open('sheet.svg','w').write(svg(cells,'0 0 1000 720',1000,720,BG))
