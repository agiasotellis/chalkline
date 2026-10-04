import asyncio, glob, os
from playwright.async_api import async_playwright
files=sorted(glob.glob('/home/claude/chalkline/brand/logo/*.svg'))
html='<body style="margin:0;font-family:sans-serif;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:16px;background:#ddd">'
for f in files:
    dark='white' in f or 'dark' in f
    html+=f'<div style="background:{"#16202A" if dark else "#fff"};padding:20px;border-radius:12px;height:170px;display:grid;place-items:center"><img src="file://{f}" style="max-width:100%;max-height:120px"></div>'
open('/home/claude/chalkline/brand/work/prev.html','w').write(html)
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1100,'height':900})
        await pg.goto('file:///home/claude/chalkline/brand/work/prev.html'); await pg.wait_for_timeout(300); await pg.screenshot(path='/home/claude/chalkline/brand/work/prev.png', full_page=True); await b.close()
asyncio.run(m())
