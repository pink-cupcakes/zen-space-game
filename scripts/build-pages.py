#!/usr/bin/env python3
"""Package tracked runtime files only; omit Git history, notes, and art prompts."""
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '_site'
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
asset_types = {'.png', '.jpg', '.jpeg', '.webp', '.svg', '.mp3', '.ogg', '.wav', '.ttf', '.woff', '.woff2', '.html'}
files = []
for name in filter(None, tracked):
    path = Path(name)
    runtime = len(path.parts) == 1 and (name == 'index.html' or path.suffix in {'.js', '.css'})
    asset = path.parts[0] == 'assets' and (path.suffix in asset_types or path.name in {'Tiny5-OFL.txt', 'CC0-1.0.txt'})
    vendor = path.parts[:2] == ('assets', 'vendor') and (path.suffix == '.js' or path.name == 'LICENSE')
    if runtime or asset or vendor:
        if (ROOT / path).is_symlink():
            raise SystemExit(f'Refusing symlink in site bundle: {path}')
        files.append(path)
if Path('index.html') not in files:
    raise SystemExit('Tracked index.html is required')
if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
for path in files:
    target = OUTPUT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / path, target)
(OUTPUT / '.nojekyll').touch()
size = sum((OUTPUT / path).stat().st_size for path in files)
print(f'Packaged {len(files)} files ({size / 1024 / 1024:.1f} MiB) into {OUTPUT}')
