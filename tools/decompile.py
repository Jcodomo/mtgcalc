#!/usr/bin/env python3
"""Decompile the Loan Suite (full-suite.html) into a website-ready folder.

  assets/js/NN-*.js            every inline script, byte for byte, loaded at its original position
  assets/loan-suite-styles.js  every inline stylesheet; a one-line call at each original position
                               recreates the same <style> element there (print/report code copies
                               <style> elements, so they must stay real <style> elements)
  assets/*.js                  the companion scripts (income-enhancements, loan-ux, sync-bridge, workflow-ui)
  loan-suite-<page>.html       one page per Loan Suite tab: original markup + script tags + page config
  full-suite.html              the whole suite, on the same shared assets

usage: decompile.py <repo-dir> <out-dir>
"""
import sys, re, json, pathlib, shutil
sys.path.insert(0, str(pathlib.Path(__file__).parent)); from split import scan

SRC, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
MIG = "<script>/* 55.15: OLED dark blue by default (once for everyone; afterwards the Look menu / theme switch decides) */(function(){try{var L=localStorage,k='mt.oledDefault.v1';if(!L.getItem(k)){L.setItem('los.v25.surface','oled');L.setItem('uwTheme','dark');['los.v251.appearanceSeeded','los.v35.appearanceSeeded','v15ThemeSeeded'].forEach(function(f){L.setItem(f,'1')});L.setItem(k,'1');}document.documentElement.setAttribute('data-mt-mode',L.getItem('los.v25.surface')==='light'&&L.getItem('uwTheme')!=='dark'?'light':'oled');}catch(e){}})();</script>"
VER = '57.1'   # cache key for the shared assets: change it with every release
COMPANIONS = ['income-enhancements.js', 'loan-ux.js', 'sync-bridge.js', 'workflow-ui.js', 'quick-worksheet.js', 'income-features.js', 'loan-docs-ai.js', 'loan-cards.js', 'income-extras.js', 'quick-engine.js',
              'mt-live.js', 'release56-income.js', 'release56-suite.js', 'doc-center.js', 'mt-mnd.js', 'mt-data.js', 'doc-builder.js', 'mt-addr.js', 'mt-paste.js', 'mt-search.js', 'mt-build-lazy.js', 'mt-libs.js', 'ic-simple.js', 'nmb-report.js', 'nmb-template.js']

# page id, file, tab label as the app names it, group, short title
PAGES = [
    ('quote',               'QUOTE',                  'file',         'Quote & Setup'),
    ('setup',               'SETUP',                  'file',         'Setup'),
    ('renovation',          'RENOVATION',             'file',         'Renovation'),
    ('property',            'PROPERTY',               'loan',         'Property'),
    ('max-mortgage',        'MAX MORTGAGE',           'loan',         'Max Mortgage'),
    ('mortgage-rates',      'MORTGAGE RATES',         'loan',         'Mortgage Rates'),
    ('closing-costs',       'CLOSING',                'costs',        'Closing Costs'),
    ('escrow',              'ESCROW',                 'costs',        'Escrow'),
    ('taxes-proration',     'TAXES & PRORATION',      'costs',        'Taxes & Proration'),
    ('qualify',             'QUALIFY',                'underwriting', 'Qualify'),
    ('rental',              'RENTAL',                 'underwriting', 'Rental'),
    ('credit',              'CREDIT',                 'underwriting', 'Credit'),
    ('advanced',            'ADVANCED',               'underwriting', 'Advanced'),
    ('contract-le',         'CONTRACT & LE',          'underwriting', 'Contract & LE'),
    ('scenarios',           'SCENARIOS',              'results',      'Scenarios'),
    ('summary',             'SUMMARY',                'results',      'Summary'),
    ('documents-ocr',       'DOCUMENTS & OCR',        'results',      'Documents & OCR'),
    ('documents-worksheets','DOCUMENTS & WORKSHEETS', 'results',      'Documents & Worksheets'),
    ('draft-le',            'DRAFT LE',               'results',      'Draft LE'),
]
GROUPS = [('file', 'File'), ('loan', 'Loan'), ('costs', 'Costs'), ('underwriting', 'Underwriting'), ('results', 'Results')]
# 56.0: Quote, Setup and Renovation are one scrolling File page (loan-suite-quote.html); their own pages stay for old links
IN_FILE_FLOW = {'setup', 'renovation'}

def slug(text, n=36):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')[:n].strip('-') or 'part'

def main():
    html = (SRC / 'full-suite.html').read_text(encoding='utf-8').replace('\r\n', '\n')
    parts = scan(html)
    assert ''.join(o + b + c for _, o, b, c in parts) == html, 'scanner is not lossless'
    if OUT.resolve() in (SRC.resolve(), SRC.resolve().parent) or (OUT / 'tools').exists():
        sys.exit(f'refusing to overwrite {OUT}: choose an empty output folder (it is replaced on each build)')
    if OUT.exists(): shutil.rmtree(OUT)
    (OUT / 'assets' / 'js').mkdir(parents=True)

    css, skel, nscript = [], [], 0
    for k, o, b, c in parts:
        if k == 'style':
            m = re.search(r'\bid="([^"]+)"', o)
            css.append({'id': m.group(1) if m else '', 'css': b})
            skel.append(f'<script>LOSCSS({len(css) - 1})</script>')
        elif k == 'script':
            src = re.search(r'\bsrc="([^"]+)"', o)
            if src:
                name = src.group(1).split('?')[0]
                skel.append(o.replace(src.group(1), 'assets/' + src.group(1)) + c if name in COMPANIONS else o + b + c)   # 56.0: keep ?v= so a release reaches cached browsers
                continue
            body = b
            if 'window.LOS_PAGE=' in body:                 # page bootstrap: per page, filled in below
                skel.append('<!--LOS-PAGE-BOOT-->'); continue
            if len(body) < 1200 and not body.strip().startswith('!function(){"use strict";if(!window.LOS_SCHEDULER'):
                skel.append(o + b + c); continue          # tiny bootstraps stay inline (release stamp, lib loader)
            nscript += 1
            m = re.search(r'\bid="([^"]+)"', o)
            first = re.sub(r'^[\s/*!=(){}"\'a-z]{0,40}', '', body.strip()[:80])
            name = f'{nscript:02d}-{slug(m.group(1) if m else first)}.js'
            (OUT / 'assets' / 'js' / name).write_text(body, encoding='utf-8')
            attrs = re.sub(r'^<script', '', o)[:-1]
            skel.append(f'<script{attrs} src="assets/js/{name}?v={VER}"></script>')
        else:
            skel.append(b)
    if '<!--LOS-PAGE-BOOT-->' not in skel:                     # older builds have no page bootstrap: put it first in <head>
        k = next(i for i, part in enumerate(skel) if '<head>' in part)
        skel[k] = skel[k].replace('<head>', '<head>\n<!--LOS-PAGE-BOOT-->', 1)
    first_css = next(i for i, s in enumerate(skel) if s.startswith('<script>LOSCSS('))
    loader = ('/* Release 55.12 stylesheets, recreated as real <style> elements at their original positions. */\n'
              'window.__LOSCSS=' + json.dumps(css) + ';\n'
              'window.LOSCSS=function(i){var d=window.__LOSCSS[i],s=document.createElement("style");if(d.id)s.id=d.id;s.textContent=d.css;'
              'var me=document.currentScript;if(me&&me.parentNode)me.parentNode.insertBefore(s,me.nextSibling);else document.head.appendChild(s);};\n')
    (OUT / 'assets' / 'loan-suite-styles.js').write_text(loader, encoding='utf-8')
    skel[first_css] = f'<script src="assets/loan-suite-styles.js?v={VER}"></script>\n' + skel[first_css]
    skeleton = ''.join(skel)

    for f in COMPANIONS:
        if (SRC / f).exists(): shutil.copy(SRC / f, OUT / 'assets' / f)
    mt_data(OUT)
    for f in ['loan-suite-embed.js', 'loan-suite-embed.css', 'mtgcalc-theme.css']:
        shutil.copy(pathlib.Path(__file__).parent / f, OUT / 'assets' / f)

    pages_js = json.dumps([dict({'id': p, 'file': f'loan-suite-{p}.html', 'label': l, 'group': g, 'title': t}, **({'nav': False} if p in IN_FILE_FLOW else {})) for p, l, g, t in PAGES])
    def boot(page, title, app='suite'):
        cfg = {'page': page, 'title': title, 'pages': json.loads(pages_js), 'groups': [{'id': a, 'label': b} for a, b in GROUPS]}
        cfg['persistCalc'] = not (SRC / 'income-calculator.html').exists()   # no stand-alone calculator: keep the built-in one's state between pages
        cfg['legacy'] = cfg['persistCalc']                                       # v54-era app: also carries the name-field typing fix
        return ('<script>/* 55.15: OLED dark blue by default (once for everyone; afterwards the Look menu / theme switch decides) */(function(){try{var L=localStorage,k=\'mt.oledDefault.v1\';if(!L.getItem(k)){L.setItem(\'los.v25.surface\',\'oled\');L.setItem(\'uwTheme\',\'dark\');[\'los.v251.appearanceSeeded\',\'los.v35.appearanceSeeded\',\'v15ThemeSeeded\'].forEach(function(f){L.setItem(f,\'1\')});L.setItem(k,\'1\');}document.documentElement.setAttribute(\'data-mt-mode\',L.getItem(\'los.v25.surface\')===\'light\'&&L.getItem(\'uwTheme\')!==\'dark\'?\'light\':\'oled\');}catch(e){}})();</script>\n' + '<script>window.LOS_PAGE="' + ('allinone' if page else 'full') + '";window.LOS_EMBED=' + json.dumps(cfg) + ';'
                'if(!/[?&]app=/.test(location.search)){try{history.replaceState(null,"",location.pathname+(location.search?location.search+"&":"?")+"app=' + app + '"+location.hash)}catch(e){}}</script>\n'
                '<link rel="stylesheet" href="assets/loan-suite-embed.css?v=56.0">\n<link rel="stylesheet" href="assets/mtgcalc-theme.css?v=56.0">')
    tail = '<script src="assets/loan-suite-embed.js?v=56.0"></script>\n'
    def emit(fname, page, title, doc_title, app='suite'):
        doc = skeleton.replace('<!--LOS-PAGE-BOOT-->', boot(page, title, app), 1)
        doc = re.sub(r'<title>[^<]*</title>', f'<title>{doc_title}</title>', doc, count=1)
        i = doc.rindex('</body>'); doc = doc[:i] + tail + doc[i:]
        (OUT / fname).write_text(doc, encoding='utf-8')
        return len(doc.encode())
    for p, l, g, t in PAGES:
        n = emit(f'loan-suite-{p}.html', p, t, f'{t} · Loan Suite')
        print(f'  loan-suite-{p}.html  {n:,}')
    # the whole suite on the same shared assets (no page lock)
    n = emit('full-suite.html', '', 'Full Suite', 'Full Suite · Mortgage Suite'); print(f'  full-suite.html  {n:,}')
    if not (SRC / 'income-calculator.html').exists():
        n = emit('income-calculator.html', 'income', 'Income Calculator', 'Income Calculator · Mortgage Suite', app='income')
        print(f'  income-calculator.html  {n:,}  (the app on its Income workspace)')
    # stand-alone feature pages from the repo, companion scripts pointed at assets/
    comp = re.compile(r'src="(' + '|'.join(re.escape(c[:-3]) for c in COMPANIONS) + r')\.js')
    for f in ['income-calculator.html', 'quick.html', 'doc-organizer.html']:
        if (SRC / f).exists():
            t = (SRC / f).read_text(encoding='utf-8').replace('\r\n', '\n')
            t = comp.sub(r'src="assets/\1.js', t)
            tag = {'income-calculator.html': 'income', 'quick.html': 'quick', 'doc-organizer.html': 'docorg'}[f]
            t = re.sub(r'<html\b', f'<html data-mt-page="{tag}"', t, count=1)
            t = re.sub(r'(<head[^>]*>)', lambda m: m.group(1) + '\n' + MIG, t, count=1)
            t = t.replace('</head>', '<link rel="stylesheet" href="assets/mtgcalc-theme.css">\n</head>', 1)
            if f == 'quick.html':
                # 55.23: Quick runs the Loan Suite engine for its estimates - the module loader and the engine bundle
                eng = next(x for x in sorted((OUT / 'assets' / 'js').glob('*.js')) if 'define("src/core/calc/engine"' in x.read_text(encoding='utf-8'))
                shim = next(m.group(1) for m in re.finditer(r'<script>([\s\S]*?)</script>', (OUT / 'loan-suite-quote.html').read_text(encoding='utf-8')) if 'window.define=function' in m.group(1))
                t = t.replace('<script src="assets/quick-engine.js', '<script>' + shim + '</script>\n<script src="assets/js/' + eng.name + '?v=' + VER + '"></script>\n<script src="assets/quick-engine.js', 1)
                assert 'assets/js/' + eng.name in t
            (OUT / f).write_text(t, encoding='utf-8'); print(f'  {f}  (companion scripts -> assets/, shared theme)')
    # 55.23: Quick is the home page; the page list moves to pages.html
    (OUT / 'index.html').write_text((OUT / 'quick.html').read_text(encoding='utf-8'), encoding='utf-8'); print('  index.html  (home = Quick)')
    hub(OUT)
    # the Income Calculator as one self-contained file: companion scripts inlined (OCR libraries still load from their CDNs)
    t = (OUT / 'income-calculator.html').read_text(encoding='utf-8')
    def inline(m):
        body = (OUT / 'assets' / (m.group(1) + '.js')).read_text(encoding='utf-8')
        assert '</script' not in body.lower(), m.group(1)
        return '<script>/* ' + m.group(1) + '.js (inlined) */\n' + body + '\n</script>'
    t2 = re.sub(r'<script[^>]*src="assets/([a-z0-9-]+)\.js[^"]*"[^>]*></script>', inline, t)
    def inline_any(m):
        body = (OUT / m.group(2)).read_text(encoding='utf-8'); assert '</script' not in body.lower(), m.group(2)
        return m.group(1).replace(' src="' + m.group(2) + '"', '') + body + '</script>'
    t2 = re.sub(r'(<script[^>]*src="(assets/[^"?]+\.js)"[^>]*>)</script>', inline_any, t2)
    t2 = re.sub(r'<link rel="stylesheet" href="(assets/[^"]+\.css)">', lambda m: '<style>' + (OUT / m.group(1)).read_text(encoding='utf-8') + '</style>', t2)
    assert 'src="assets/' not in t2 and 'href="assets/' not in t2, 'single file still references assets/'
    (OUT / 'income-calculator-standalone.html').write_text(t2, encoding='utf-8')
    print(f'  income-calculator-standalone.html  {len(t2.encode()):,}  (single file)')
    js = sum(f.stat().st_size for f in (OUT / 'assets').rglob('*.js'))
    print(f'shared assets: {js:,} bytes in {len(list((OUT / "assets").rglob("*.js")))} files; {len(css)} stylesheets; {nscript} scripts')

def mt_data(OUT):
    """56.1: the engine's own reference tables (state transfer taxes, NY mansion and mortgage recording taxes, seller
    concession limits, states and counties) as a small stand-alone file, so pages without the engine (the Income
    Calculator, Quick) use the same figures as the Loan Suite. Copied byte for byte from the engine bundle."""
    eng = next(x for x in sorted((OUT / 'assets' / 'js').glob('*.js')) if 'define("src/core/calc/engine"' in x.read_text(encoding='utf-8'))
    t = eng.read_text(encoding='utf-8'); blocks = []
    for mod in ['transferTaxes', 'concessionLimits', 'luxuryTaxes', 'mortgageRecordingTax', 'states']:
        i = t.find('define("src/core/data/' + mod + '"'); assert i >= 0, mod
        j = t.find('define("', i + 10); body = t[i:j].rstrip().rstrip(',;')
        assert body.endswith('})') and '["require","exports"]' in body[:80], mod
        blocks.append(body + ';')
    js = ('/* Mortgage Suite reference tables, copied from the Loan Suite engine at build time (tools/decompile.py mt_data). */\n'
          '(function(){var M={};function define(n,d,f){var ex={};f(null,ex);M[n.split("/").pop()]=ex;}\n' + '\n'.join(blocks) +
          '\nwindow.MTData=M;})();\n')
    (OUT / 'assets' / 'mt-data.js').write_text(js, encoding='utf-8')

def hub(OUT):
    """Site index: every feature page, grouped the way the app groups them."""
    cards = [('quick.html', 'Quick', 'Quick income worksheet and fast mortgage calculator.'),
             ('income-calculator.html', 'Income Calculator', 'W-2, self-employment, rental and other income, document import with OCR, AUS findings, DTI.'),
             ('doc-organizer.html', 'Doc Organizer', 'Read, rename, split and combine borrower documents; send reviewed fields onward.'),
             ('full-suite.html', 'Full Suite', 'The complete Loan Suite in one page. The Income Calculator is its own page.')]
    sec = []
    for gid, glabel in GROUPS:
        links = ''.join(f'<li><a href="loan-suite-{p}.html">{t}</a></li>' for p, l, g, t in PAGES if g == gid)
        sec.append(f'<section><h3>{glabel}</h3><ul>{links}</ul></section>')
    cards = [c for c in cards if (OUT / c[0]).exists()]
    html = """<!DOCTYPE html>
<html lang="en" data-mt-page="hub"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="assets/mtgcalc-theme.css">
""" + MIG + """
<title>Mortgage Suite</title>
<style>
:root{--bg:#eef2f7;--panel:#fff;--ink:#0f2a4a;--mute:#56677a;--line:#d5dee9;--acc:#1f6fd6;--nav:#0f2a4a}
@media (prefers-color-scheme:dark){:root{--bg:#0d1726;--panel:#15233a;--ink:#eaf1fb;--mute:#9db0c8;--line:#26384f;--acc:#5aa2ff;--nav:#0a121f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding-bottom:90px}
header{background:var(--nav);color:#fff;padding:14px clamp(16px,4vw,40px);font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:14px}
main{max-width:1120px;margin:0 auto;padding:clamp(22px,4vw,44px) clamp(16px,4vw,40px)}
h1{margin:0 0 6px;font-size:clamp(26px,3.6vw,34px);letter-spacing:-.02em}p.lede{margin:0 0 24px;color:var(--mute)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:14px;margin-bottom:30px}
.cards a{display:block;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px;text-decoration:none;color:inherit}
.cards a:hover{border-color:var(--acc)}.cards b{display:block;font-size:17px;margin-bottom:4px}.cards span{color:var(--mute);font-size:13.5px}
h2{font-size:18px;margin:0 0 12px}.groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:14px}
section{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px}h3{margin:0 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
ul{list-style:none;margin:0;padding:0}li a{display:block;padding:6px 0;color:var(--acc);text-decoration:none;font-weight:600}li a:hover{text-decoration:underline}
a:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
</style></head><body>
<header>Mortgage Suite</header>
<main>
<h1>Mortgage Suite</h1>
<p class="lede">Every tool as its own page. They share one saved loan file in this browser, so a change on one page shows on the others.</p>
<div class="cards">""" + ''.join(f'<a href="{h}"><b>{t}</b><span>{d}</span></a>' for h, t, d in cards) + """</div>
<h2>Loan Suite pages</h2>
<div class="groups">""" + ''.join(sec) + """</div>
</main>
""" + ('<script src="assets/workflow-ui.js?v=55.12"></script>\n' if (OUT / 'assets' / 'workflow-ui.js').exists() else '') + """</body></html>
"""
    (OUT / 'pages.html').write_text(html, encoding='utf-8'); print('  pages.html  (every page)')

if __name__ == '__main__':
    main()
