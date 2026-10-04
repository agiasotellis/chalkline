# Outline text from Archivo variable font at a given width/weight into an SVG path.
import sys, json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
SRC='/tmp/claude-0/font/node_modules/@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2'
_cache={}
def inst(wdth, wght):
    k=(wdth,wght)
    if k not in _cache:
        f=TTFont(SRC); axes={a.axisTag for a in f['fvar'].axes}
        loc={'wght':wght}
        if 'wdth' in axes: loc['wdth']=wdth
        _cache[k]=instantiateVariableFont(f, loc)
    return _cache[k]
def text_path(text, wdth=125, wght=760, tracking=-20, size=100):
    f=inst(wdth,wght); gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm; hmtx=f['hmtx']
    s=size/upm; x=0; pen=SVGPathPen(gs); bp=BoundsPen(gs)
    for ch in text:
        g=cmap[ord(ch)]
        tp=TransformPen(pen,(s,0,0,-s,x,0)); gs[g].draw(tp)
        tb=TransformPen(bp,(s,0,0,-s,x,0)); gs[g].draw(tb)
        x+= hmtx[g][0]*s + tracking*s
    return pen.getCommands(), bp.bounds, x - tracking*s
if __name__=='__main__':
    d,b,w=text_path(sys.argv[1] if len(sys.argv)>1 else 'chalkline')
    print(json.dumps({'bounds':b,'adv':w,'len':len(d)}))

def wordmark(text='chalkline', wdth=125, wght=760, tracking=-20, size=100):
    """Wordmark with the tittle of 'i' split out so it can carry the accent colour."""
    f=inst(wdth,wght); gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm; hmtx=f['hmtx']
    s=size/upm; x=0; pen=SVGPathPen(gs); bp=BoundsPen(gs); dots=[]
    for ch in text:
        g=cmap[ord(ch)]
        if ch=='i':
            # body = dotless i, dot = bounds of i above the dotless body
            bi=BoundsPen(gs); gs['i'].draw(TransformPen(bi,(s,0,0,-s,x,0)))
            bd=BoundsPen(gs); gs['dotlessi'].draw(TransformPen(bd,(s,0,0,-s,x,0)))
            dots.append((bi.bounds[0], bi.bounds[1], bi.bounds[2], bd.bounds[1]-(bd.bounds[1]-bi.bounds[1])*0.0))
            g='dotlessi'
        gs[g].draw(TransformPen(pen,(s,0,0,-s,x,0))); gs[g].draw(TransformPen(bp,(s,0,0,-s,x,0)))
        x+=hmtx[g][0]*s+tracking*s
    return pen.getCommands(), bp.bounds, x-tracking*s, dots
