#!/usr/bin/env python3
"""
stamp-cache-bust.py
Reads the current git HEAD short hash and:
1. Stamps ?v=<hash> onto every local script/stylesheet import in registry HTML files.
2. Injects a version comment at the top of each registry JS file so Cloudflare
   sees the file content changed and invalidates its CDN cache automatically.
Run automatically via .git/hooks/pre-commit.
"""
import subprocess, re, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_hash():
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--short', 'HEAD'],
            capture_output=True, text=True, cwd=ROOT
        )
        return result.stdout.strip() or 'dev'
    except Exception:
        return 'dev'

HTML_FILES = [
    '_registro-wip/registro.html',
    '_registro-wip/registro-paciente.html',
    '_registro-wip/registro-sugerencias.html',
]

JS_FILES = [
    '_registro-wip/registro-app.js',
    '_registro-wip/registro-data.js',
    '_registro-wip/registro-paciente.js',
    '_registro-wip/registro-i18n.js',
]

# Match local (no http) script src and link href with optional existing ?v=...
SCRIPT_RE = re.compile(r'(<script\s+src=")((?!http)[^"?]+?)(\?v=[^"]*)?(")')
LINK_RE   = re.compile(r'(<link\s+[^>]*href=")((?!http)[^"?]+?\.css)(\?v=[^"]*)?(")')

# Version comment at top of JS files
VER_RE = re.compile(r'^// @version [a-f0-9]+\n')

def stamp_html(content, h):
    content = SCRIPT_RE.sub(lambda m: f'{m.group(1)}{m.group(2)}?v={h}{m.group(4)}', content)
    content = LINK_RE.sub(  lambda m: f'{m.group(1)}{m.group(2)}?v={h}{m.group(4)}', content)
    return content

def stamp_js(content, h):
    # Replace or insert version comment at top
    ver_line = f'// @version {h}\n'
    if VER_RE.match(content):
        return VER_RE.sub(ver_line, content, count=1)
    else:
        return ver_line + content

def main():
    h = get_hash()
    changed = []

    for rel in HTML_FILES:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        original = open(path, encoding='utf-8').read()
        updated  = stamp_html(original, h)
        if updated != original:
            open(path, 'w', encoding='utf-8').write(updated)
            changed.append(rel)
            subprocess.run(['git', 'add', path], cwd=ROOT)

    for rel in JS_FILES:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        original = open(path, encoding='utf-8').read()
        updated  = stamp_js(original, h)
        if updated != original:
            open(path, 'w', encoding='utf-8').write(updated)
            changed.append(rel)
            subprocess.run(['git', 'add', path], cwd=ROOT)

    if changed:
        print(f'[cache-bust] Stamped ?v={h} -> {", ".join(changed)}')
    else:
        print(f'[cache-bust] Already stamped ?v={h}, no changes.')

if __name__ == '__main__':
    main()
