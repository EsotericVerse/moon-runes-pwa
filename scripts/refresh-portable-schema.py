"""Refresh the checked-in PostgreSQL schema from fresh catalog JSON exports."""
import subprocess
import sys
from pathlib import Path

root=Path(__file__).resolve().parents[1]
if len(sys.argv)!=3:
    raise SystemExit('Usage: python scripts/refresh-portable-schema.py <catalog.json> <boundary.json>')
subprocess.run([
    sys.executable,
    str(root/'scripts/prepare-portable-schema.py'),
    sys.argv[1],
    sys.argv[2],
    str(root/'docs/sql/portable-current-schema.sql')
],check=True)
