import re
CYR = re.compile(r'[А-Яа-яЁё]')
TOK = re.compile(r'(<!--.*?-->|<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)', re.S)
ATTR = re.compile(r'(\s[\w:-]+=")([^"]*)(")')

def tokens(html):
    return [t for t in TOK.split(html) if t != '']

def is_tag(t):
    return t.startswith('<')

def split_ws(t):
    m = re.match(r'^(\s*)(.*?)(\s*)$', t, re.S)
    return m.group(1), m.group(2), m.group(3)
