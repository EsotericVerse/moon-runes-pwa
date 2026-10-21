#!/usr/bin/env python3
"""Rename "<number>_<anything>.<ext>" files to "<number>.<ext>" in a folder.

Usage:
    python3 scripts/rename-numeric-prefix.py <folder>

Example:
    python3 scripts/rename-numeric-prefix.py pics/64images
    # 01_靈.png -> 01.png, 29_根.png -> 29.png, ...

If the target folder is a git working tree, renames are done with
`git mv` so git records them as renames (keeps history) instead of a
delete+add pair. Falls back to a plain filesystem rename if the folder
isn't tracked by git or git isn't available.
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

PATTERN = re.compile(r'^(\d+)_.+(\.[A-Za-z0-9]+)$')


def in_git_repo(folder: Path) -> bool:
    if shutil.which('git') is None:
        return False
    result = subprocess.run(
        ['git', 'rev-parse', '--is-inside-work-tree'],
        cwd=folder, capture_output=True, text=True
    )
    return result.returncode == 0 and result.stdout.strip() == 'true'


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    folder = Path(sys.argv[1])
    if not folder.is_dir():
        print(f'Not a directory: {folder}')
        sys.exit(1)

    use_git = in_git_repo(folder)
    renamed = 0
    skipped = 0

    for entry in sorted(folder.iterdir()):
        if not entry.is_file():
            continue
        match = PATTERN.match(entry.name)
        if not match:
            skipped += 1
            continue
        number, ext = match.groups()
        new_name = f'{number}{ext}'
        if new_name == entry.name:
            continue
        target = folder / new_name
        if target.exists():
            print(f'SKIP (target exists): {entry.name} -> {new_name}')
            skipped += 1
            continue
        if use_git:
            subprocess.run(['git', 'mv', '--', entry.name, new_name], cwd=folder, check=True)
        else:
            entry.rename(target)
        print(f'{entry.name} -> {new_name}')
        renamed += 1

    print(f'\nDone. Renamed {renamed}, skipped {skipped}.')


if __name__ == '__main__':
    main()
