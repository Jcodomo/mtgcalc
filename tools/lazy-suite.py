#!/usr/bin/env python3
"""Load four independent scripts on the Loan Suite pages after the page has finished loading.

usage: python tools/lazy-suite.py            (edit the pages in place; running it again changes nothing)
       python tools/lazy-suite.py --check    (exit 1 if a page still needs the change)

Only the Loan Suite pages are touched: loan-suite*.html, full-suite.html, all-in-one.html.
The Income Calculator pages, Quick (and its income worksheet), the Doc Organizer and every shared script stay as they are.

The four scripts:
    loan-docs-ai.js   AI document import on the Documents pages
    mt-paste.js       "Paste screenshot" buttons and Ctrl+V into document readers
    ghost-bridge.js   the "open in Ghost Calligrapher" card after a PDF download
    mt-quick-edit.js  the quick popup when a Live Summary figure is clicked
Nothing else on these pages reads them while starting up, each one guards against running twice, and none waits for a
page event that would already be over. They still run in the same order, with the same ?v= cache keys.
The old Income Calculator scripts are NOT deferred: the suite patches them once while loading, so they keep their place.

Second step (57.38, id="mt-suite-speed"), also after the page has loaded:
    - registers suite-sw.js, which keeps versioned assets/ files on the device for Loan Suite pages only
    (hover prefetch of other pages already exists in assets/workflow-ui.js, so none is added here)
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LATE = ['loan-docs-ai', 'mt-paste', 'ghost-bridge', 'mt-quick-edit']
MARK = 'mt-late-load'
TAG = re.compile(r'<script src="(assets/(?:' + '|'.join(map(re.escape, LATE)) + r')\.js(?:\?v=[^"]*)?)"></script>(\r?\n)?')

def pages():
    names = sorted(p.name for p in ROOT.glob('loan-suite*.html')) + ['full-suite.html', 'all-in-one.html']
    return [ROOT / n for n in names if (ROOT / n).exists()]

def patch(html: str) -> str:
    if MARK in html:
        return html
    urls = [m.group(1) for m in TAG.finditer(html)]
    if not urls:
        return html
    nl = '\r\n' if '\r\n' in html else '\n'
    out = TAG.sub('', html)
    loader = ('<script id="' + MARK + '">/* 57.38: these run once the page has finished loading (tools/lazy-suite.py) */'
              '(function(){var u=[' + ','.join('"' + x + '"' for x in urls) + '];'
              'function go(){u.forEach(function(s){var e=document.createElement("script");e.src=s;e.async=false;document.body.appendChild(e);});}'
              'if(document.readyState==="complete")setTimeout(go,0);else window.addEventListener("load",function(){setTimeout(go,0);});})();</script>' + nl)
    i = out.rindex('</body>')
    out = out[:i] + loader + out[i:]
    # safety: the only difference is the moved tags - every other line is unchanged
    removed = [l for l in html.splitlines() if l not in out.splitlines()]
    assert all(TAG.fullmatch(l + nl) or TAG.fullmatch(l) for l in removed), removed
    assert len(out.splitlines()) == len(html.splitlines()) - len(urls) + 1
    return out

SPEED = 'mt-suite-speed'
SPEED_JS = ('<script id="' + SPEED + '">/* 57.38: after the page has loaded, keep the suite files on the device (suite-sw.js; tools/lazy-suite.py) */'
            '(function(){function go(){'
            'try{if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("suite-sw.js").then(function(){return navigator.serviceWorker.ready;}).then(function(r){'
            'var u=performance.getEntriesByType("resource").map(function(e){return e.name;}).filter(function(n){return n.indexOf("/assets/")>-1&&n.indexOf("v=")>-1;});'
            'if(r.active&&u.length)r.active.postMessage({mtCache:u});}).catch(function(){});}catch(e){}'
            '}'
            'if(document.readyState==="complete")setTimeout(go,0);else window.addEventListener("load",function(){setTimeout(go,0);});})();</script>')

def add_speed(html: str) -> str:
    """Second step (57.38): one more loader line before </body>. Running it again changes nothing."""
    if MARK not in html:
        return html
    if SPEED in html:   # already there: bring it up to date
        return re.sub(r'<script id="' + SPEED + r'">.*?</script>', lambda m: SPEED_JS, html, count=1, flags=re.S)
    nl = '\r\n' if '\r\n' in html else '\n'
    i = html.rindex('</body>')
    out = html[:i] + SPEED_JS + nl + html[i:]
    assert len(out.splitlines()) == len(html.splitlines()) + 1
    return out

def main():
    check = '--check' in sys.argv
    todo = 0
    for p in pages():
        with open(p, encoding='utf-8', newline='') as f: t = f.read()     # keep CRLF / LF exactly as stored
        t2 = add_speed(patch(t))
        if t2 != t:
            todo += 1
            if not check:
                with open(p, 'w', encoding='utf-8', newline='') as f: f.write(t2)
            print(('needs change: ' if check else 'updated: ') + p.name)
    print(f'{todo} page(s) {"need the change" if check else "updated"}')
    if check and todo:
        sys.exit(1)

if __name__ == '__main__':
    main()
