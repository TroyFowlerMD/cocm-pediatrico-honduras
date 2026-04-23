#!/usr/bin/env python3
"""
stamp-cache-bust.py
Reads the current git HEAD short hash and stamps it as ?v=<hash>
onto every local script/stylesheet import in the registry HTML files.
Run automatically via .git/hooks/pre-commit.
"""
import subprocess, re, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_hash():
    try:
        # Use STAGED tree hash so it matches what's being committed
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

# Match local (no http) script src and link href with optional existing ?v=...
SCRIPT_RE = re.compile(r'(<script\s+src=")((?!http)[^"?]+?)(\?v=[^"]*)?(")')
LINK_RE   = re.compile(r'(<link\s+[^>]*href=")((?!http)[^"?]+?\.css)(\?v=[^"]*)?(")')

def stamp(content, h):
    content = SCRIPT_RE.sub(lambda m: f'{m.group(1)}{m.group(2)}?v={h}{m.group(4)}', content)
    content = LINK_RE.sub(  lambda m: f'{m.group(1)}{m.group(2)}?v={h}{m.group(4)}', content)
    return content

def main():
    h = get_hash()
    changed = []
    for rel in HTML_FILES:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        original = open(path, encoding='utf-8').read()
        updated  = stamp(original, h)
        if updated != original:
            open(path, 'w', encoding='utf-8').write(updated)
            changed.append(rel)
            # Re-stage the file so the stamped version is included in the commit
            subprocess.run(['git', 'add', path], cwd=ROOT)
    if changed:
        print(f'[cache-bust] Stamped ?v={h} → {", ".join(changed)}')
    else:
        print(f'[cache-bust] Already stamped ?v={h}, no changes.')

if __name__ == '__main__':
    main()
