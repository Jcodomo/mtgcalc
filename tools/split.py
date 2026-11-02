"""Lossless scan of an HTML document into ordered (kind, open_tag, body, close_tag) parts.
A <script>/<style> element ends at its own closing tag, so markup-like text inside scripts is never misread."""
import re
def scan(html):
    out=[]; i=0; tag=re.compile(r'<(script|style)\b[^>]*>', re.I); low=html.lower()
    while True:
        m=tag.search(html,i)
        if not m: out.append(('markup','',html[i:],'')); break
        if m.start()>i: out.append(('markup','',html[i:m.start()],''))
        kind=m.group(1).lower(); close=f'</{kind}>'; e=low.find(close,m.end())
        if e<0: raise SystemExit(f'unterminated <{kind}> at {m.start()}')
        out.append((kind,m.group(0),html[m.end():e],html[e:e+len(close)])); i=e+len(close)
    return out
