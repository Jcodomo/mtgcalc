"""Turns the visible sheets of the NMB Income Worksheet (.xlsm) into a layout template for the Income Calculator's
"NMB Income Worksheet" report: column widths, row heights, merged cells, fonts, fills, borders, alignment, number formats
and the static text. Values are filled in by the calculator at report time. Nothing in the workbook is run (no macros).

Usage: python -I tools/nmb/extract.py <workbook.xlsm> <out.js>
"""
import sys, zipfile, re, json, colorsys
from xml.etree import ElementTree as ET

M = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
q = lambda t: '{%s}%s' % (M, t)

src, out = sys.argv[1], sys.argv[2]
z = zipfile.ZipFile(src)

# ---------------------------------------------------------------- theme colours
theme = []
try:
    th = ET.fromstring(z.read('xl/theme/theme1.xml'))
    cs = th.find('.//{%s}clrScheme' % A)
    for tag in ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink']:
        el = cs.find('{%s}%s' % (A, tag)); c = None
        for ch in el:
            c = ch.get('lastClr') or ch.get('val')
        theme.append(c or '000000')
    theme[0], theme[1], theme[2], theme[3] = theme[1], theme[0], theme[3], theme[2]   # Excel swaps dk/lt in the index order
except Exception:
    theme = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47', '0563C1', '954F72']
INDEXED = ['000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF'] * 1 + ['000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF', '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080', '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF', '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF', '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99', '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696', '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333']

def tinted(hexc, tint):
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    l = l * (1 + tint) if tint < 0 else l * (1 - tint) + tint
    r, g, b = colorsys.hls_to_rgb(h, max(0, min(1, l)), s)
    return '%02X%02X%02X' % (round(r * 255), round(g * 255), round(b * 255))

def color(el):
    if el is None: return None
    if el.get('rgb'): c = el.get('rgb')[-6:]
    elif el.get('theme') is not None:
        i = int(el.get('theme')); c = theme[i] if i < len(theme) else '000000'
    elif el.get('indexed') is not None:
        i = int(el.get('indexed'))
        if i in (64, 65): return None
        c = INDEXED[i] if i < len(INDEXED) else '000000'
    else: return None
    t = float(el.get('tint') or 0)
    return '#' + (tinted(c, t) if t else c)

# ---------------------------------------------------------------- styles
st = ET.fromstring(z.read('xl/styles.xml'))
nf_el = st.find(q('numFmts'))
numfmts = {int(n.get('numFmtId')): n.get('formatCode') for n in nf_el} if nf_el is not None else {}
fonts = []
for f in st.find(q('fonts')):
    d = {}
    if f.find(q('b')) is not None and f.find(q('b')).get('val') not in ('0', 'false'): d['b'] = 1
    if f.find(q('i')) is not None and f.find(q('i')).get('val') not in ('0', 'false'): d['i'] = 1
    if f.find(q('u')) is not None: d['u'] = 1
    if f.find(q('sz')) is not None: d['sz'] = float(f.find(q('sz')).get('val'))
    if f.find(q('name')) is not None: d['nm'] = f.find(q('name')).get('val')
    c = color(f.find(q('color')))
    if c: d['c'] = c
    fonts.append(d)
fills = []
for f in st.find(q('fills')):
    p = f.find(q('patternFill')); c = None
    if p is not None and p.get('patternType') not in (None, 'none'):
        c = color(p.find(q('fgColor'))) or color(p.find(q('bgColor')))
    fills.append(c)
borders = []
for b in st.find(q('borders')):
    d = {}
    for side in ('left', 'right', 'top', 'bottom'):
        e = b.find(q(side))
        if e is not None and e.get('style'):
            d[side[0]] = [e.get('style'), color(e.find(q('color'))) or '#000000']
    borders.append(d)
xfs = []
for x in st.find(q('cellXfs')):
    d = {'f': int(x.get('fontId') or 0), 'fl': int(x.get('fillId') or 0), 'b': int(x.get('borderId') or 0), 'n': int(x.get('numFmtId') or 0)}
    al = x.find(q('alignment'))
    if al is not None:
        if al.get('horizontal'): d['h'] = al.get('horizontal')
        if al.get('vertical'): d['v'] = al.get('vertical')
        if al.get('wrapText') in ('1', 'true'): d['w'] = 1
        if al.get('indent'): d['in'] = int(al.get('indent'))
    xfs.append(d)

ss = []
if 'xl/sharedStrings.xml' in z.namelist():
    for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(q('si')):
        ss.append(''.join(t.text or '' for t in si.iter(q('t'))))

wb = ET.fromstring(z.read('xl/workbook.xml'))
rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
WANT = {'Wage Earner': 'A1:L57', 'SE & Other Income': 'A1:S134', 'Rental': 'A1:S150', 'Quick Ratio Test': 'A1:L34',
        'Rent - FHA Owner Occ.': 'A1:R140', 'Rent - FHA NOO & VA': 'A1:P75', 'Rent - Purchase': 'A1:G20',
        'Union Worker W2': 'A1:N32', 'Freddie 1099': 'A1:N32', 'Retirement Income': 'A1:J34'}

def colnum(s):
    n = 0
    for ch in s: n = n * 26 + ord(ch) - 64
    return n
def split(ref):
    m = re.match(r'([A-Z]+)(\d+)', ref); return colnum(m.group(1)), int(m.group(2))

sheets = {}
used = {}
for s in wb.find(q('sheets')):
    name = s.get('name')
    if name not in WANT: continue
    tgt = rels[s.get('{%s}id' % R)]; tgt = tgt if tgt.startswith('xl/') else 'xl/' + tgt.lstrip('/')
    x = ET.fromstring(z.read(tgt))
    a, b = WANT[name].split(':'); c1, r1 = split(a); c2, r2 = split(b)
    sf = x.find(q('sheetFormatPr')); dh = float(sf.get('defaultRowHeight') or 14.4) if sf is not None else 14.4
    dw = float(sf.get('defaultColWidth') or 8.43) if sf is not None and sf.get('defaultColWidth') else 8.43
    cols = {}
    for c in x.iter(q('col')):
        for k in range(int(c.get('min')), int(c.get('max')) + 1):
            cols[k] = {'w': float(c.get('width') or dw), 'hid': c.get('hidden') in ('1', 'true'), 's': int(c.get('style') or 0)}
    rows = {}; cells = {}
    for r in x.iter(q('row')):
        rn = int(r.get('r'))
        if rn < r1 or rn > r2: continue
        rows[rn] = {'h': float(r.get('ht') or dh), 'hid': r.get('hidden') in ('1', 'true'), 's': int(r.get('s') or 0) if r.get('customFormat') in ('1', 'true') else None}
        for c in r.findall(q('c')):
            cn, rr = split(c.get('r'))
            if cn < c1 or cn > c2: continue
            v = c.find(q('v')); t = c.get('t'); f = c.find(q('f')); val = None
            if v is not None:
                val = ss[int(v.text)] if t == 's' else v.text
            elif c.find(q('is')) is not None:
                val = ''.join(tt.text or '' for tt in c.find(q('is')).iter(q('t')))
            d = {'s': int(c.get('s') or 0)}
            if val is not None: d['v'] = val
            if t in ('s', 'str', 'inlineStr'): d['t'] = 1
            if f is not None: d['fx'] = 1
            cells['%d,%d' % (rr, cn)] = d
    merges = []
    for m in x.iter(q('mergeCell')):
        a2, b2 = m.get('ref').split(':'); mc1, mr1 = split(a2); mc2, mr2 = split(b2)
        if mr1 >= r1 and mr2 <= r2 and mc1 >= c1 and mc2 <= c2: merges.append([mr1, mc1, mr2, mc2])
    # last row actually used, so blank tails are not drawn
    last = max([int(k.split(',')[0]) for k, d in cells.items() if d.get('v') not in (None, '')] + [r1])
    sheets[name] = {'range': [r1, c1, min(r2, last + 1), c2], 'dh': dh, 'dw': dw, 'cols': {k: v for k, v in cols.items() if c1 <= k <= c2}, 'rows': rows, 'cells': cells, 'merges': merges,
                    'scale': (lambda p: int(p.get('scale') or 100) if p is not None else 100)(x.find(q('pageSetup')))}

# only the styles the kept cells use
keep = sorted({d['s'] for sh in sheets.values() for d in sh['cells'].values()} | {c['s'] for sh in sheets.values() for c in sh['cols'].values()} | {r['s'] for sh in sheets.values() for r in sh['rows'].values() if r['s'] is not None})
X = {}
for i in keep:
    x = xfs[i]; fn = fonts[x['f']]; d = {}
    if fn.get('b'): d['b'] = 1
    if fn.get('i'): d['i'] = 1
    if fn.get('u'): d['u'] = 1
    if fn.get('sz'): d['sz'] = fn['sz']
    if fn.get('nm'): d['nm'] = fn['nm']
    if fn.get('c') and fn['c'].upper() not in ('#000000',): d['c'] = fn['c']
    if fills[x['fl']]: d['bg'] = fills[x['fl']]
    if borders[x['b']]: d['bd'] = borders[x['b']]
    for k in ('h', 'v', 'w', 'in'):
        if k in x: d[k] = x[k]
    n = x['n']
    if n:
        d['nf'] = numfmts.get(n, {1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 9: '0%', 10: '0.00%', 14: 'm/d/yyyy', 15: 'd-mmm-yy', 17: 'mmm-yy', 22: 'm/d/yyyy h:mm', 164: ''}.get(n, ''))
    X[i] = d
open(out, 'w', encoding='utf-8').write('/* NMB Income Worksheet layout - extracted from the workbook by tools/nmb/extract.py; do not edit */\nwindow.NMB_TEMPLATE = ' + json.dumps({'styles': X, 'sheets': sheets}, separators=(',', ':')) + ';\n')
for n, sh in sheets.items():
    print(n, 'range', sh['range'], 'cells', len(sh['cells']), 'merges', len(sh['merges']), 'scale', sh['scale'])
print('styles kept', len(X))
