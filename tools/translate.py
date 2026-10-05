#!/usr/bin/env python3
"""Собирает en/ и zh/ из русских страниц в корне.

Запуск из корня репозитория:  python3 tools/translate.py
Проверка без записи:          python3 tools/translate.py --check

Переводы лежат в tools/i18n.tsv: колонки ru, en, zh. Новый русский текст на
странице — новая строка в таблице; если строки нет, скрипт остановится и
покажет, какие фразы не переведены, а страницы не перезапишет.
"""
import csv, glob, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from i18n_common import CYR, ATTR, tokens, is_tag, split_ws

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TSV = os.path.join(os.path.dirname(__file__), 'i18n.tsv')
BASE = 'https://airvolga3.github.io/vd-site/'
LANGS = {'en': 'en', 'zh': 'zh-CN'}
LABEL = {'ru': 'RU', 'en': 'EN', 'zh': '中文'}
# Китайской версии — системные шрифты с иероглифами (Google Fonts в Китае недоступен)
ZH_HEAD = ('<style>:root{--disp:"Golos Text","PingFang SC","Hiragino Sans GB","Microsoft YaHei",'
           '"Noto Sans CJK SC","Source Han Sans SC",sans-serif;--body:"Golos Text","PingFang SC",'
           '"Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC",sans-serif;}</style>\n')
CJK_END = re.compile(r'[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef“”—]$')
URL_ATTRS = ('href', 'src', 'srcset', 'action', 'poster', 'data-src')


def load_table():
    t = {'en': {}, 'zh': {}}
    if not os.path.exists(TSV):
        return t
    with open(TSV, encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f, delimiter='\t'):
            # колонка where: «index.html#2» — перевод только для 2-го вхождения фразы на этой странице
            key = row['ru'] + ('@' + row['where'] if row.get('where') else '')
            for l in t:
                if row.get(l):
                    t[l][key] = row[l]
    return t


def rel(url):
    if re.match(r'^(?:[a-z]+:|//|#|\.\./)', url) or url == '':
        return url
    if re.match(r'^[\w-]+\.html(?:#.*)?$', url):  # страницы лежат рядом в той же языковой папке
        return url
    return '../' + url


def fix_urls(tag, page):
    def one(m):
        name = m.group(1).strip()[:-2]
        val = m.group(2)
        if name == 'srcset':
            val = ', '.join(rel(p.strip()) for p in val.split(','))
        elif name in URL_ATTRS:
            val = rel(val)
        return m.group(1) + val + m.group(3)
    return ATTR.sub(one, tag)


def switcher(page, lang, cls):
    parts = []
    for l in ('ru', 'en', 'zh'):
        if l == lang:
            parts.append('<b>%s</b>' % LABEL[l])
        else:
            href = ('../' if lang != 'ru' else '') + ('' if l == 'ru' else l + '/') + page
            parts.append('<a href="%s">%s</a>' % (href, LABEL[l]))
    return '<div class="%s">%s</div>' % (cls, ''.join(parts))


def build(page, lang, table, missing):
    src = open(os.path.join(ROOT, page), encoding='utf-8').read()
    tr = table[lang]
    seen = {}

    def T(s):
        if not CYR.search(s):
            return tr.get(s, s)
        seen[s] = seen.get(s, 0) + 1
        ctx = '%s@%s#%d' % (s, page, seen[s])
        if ctx in tr:
            return tr[ctx]
        if s in tr:
            return tr[s]
        missing.setdefault(s, set()).add(page)
        return s

    # языковой переключатель — целиком
    src = re.sub(r'<div class="(m?lang)">.*?</div>', lambda m: switcher(page, lang, m.group(1)), src)
    out = []
    toks = tokens(src)
    for i, t in enumerate(toks):
        if t.startswith('<!--'):
            continue  # служебные комментарии вёрстки в переводы не попадают
        elif t.startswith('<script') or t.startswith('<style'):
            out.append(fix_urls(t, page) if t.startswith('<script') else t)
        elif is_tag(t):
            if t.startswith('<html'):
                t = t.replace('lang="ru"', 'lang="%s"' % LANGS[lang])
            if re.search(r'property="og:url"|rel="canonical"', t):
                t = t.replace(BASE, BASE + lang + '/', 1)
            elif 'hreflang=' not in t:
                t = fix_urls(t, page)
            # data-* — служебные ключи для фильтров в app.js, их не переводим
            t = ATTR.sub(lambda m: m.group(0) if m.group(1).lstrip().startswith('data-')
                         else m.group(1) + T(m.group(2)) + m.group(3), t)
            out.append(t)
            if lang == 'zh' and t.startswith('<link rel="stylesheet"') and 'style.css' in t:
                out.append('\n' + ZH_HEAD.rstrip('\n'))
        else:
            a, core, z = split_ws(t)
            res = T(core)
            # в китайском заголовке нет пробела перед второй, светлой частью (<span class="lt">)
            nxt = toks[i + 1] if i + 1 < len(toks) else ''
            if lang == 'zh' and z == ' ' and nxt.startswith('<span class="lt"') and CJK_END.search(res):
                z = ''
            out.append(a + res + z)
    return ''.join(out)


def main():
    check = '--check' in sys.argv
    table = load_table()
    missing = {}
    result = {}
    pages = sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, '*.html')))
    for lang in LANGS:
        for p in pages:
            result[(lang, p)] = build(p, lang, table, missing)
    if missing:
        print('Нет перевода для %d фраз (добавьте строки в tools/i18n.tsv):' % len(missing))
        for s, ps in sorted(missing.items()):
            print('  [%s] %s' % (', '.join(sorted(ps)), s[:120]))
        sys.exit(1)
    changed = 0
    for (lang, p), html in result.items():
        path = os.path.join(ROOT, lang, p)
        old = open(path, encoding='utf-8').read() if os.path.exists(path) else None
        if old != html:
            changed += 1
            if not check:
                os.makedirs(os.path.dirname(path), exist_ok=True)
                open(path, 'w', encoding='utf-8').write(html)
            print(('отличается: ' if check else 'обновлено: ') + lang + '/' + p)
    print('Готово: %d страниц, изменено %d.' % (len(result), changed))
    if check and changed:
        sys.exit(1)


if __name__ == '__main__':
    main()
