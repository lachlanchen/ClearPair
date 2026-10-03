#!/usr/bin/env python3
"""Extract bounded JSON QA rows, never the native console's audio payloads."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('console', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--expected', type=int, required=True)
args = parser.parse_args()
assert 1 <= args.expected <= 120
rows = []
done = False
for line in args.console.read_text(errors='replace').splitlines():
    if 'CLEARPAIR_REFERENCE_ROW ' in line:
        row, _ = json.JSONDecoder().raw_decode(line.split('CLEARPAIR_REFERENCE_ROW ', 1)[1].lstrip())
        rows.append(row)
    if f'CLEARPAIR_REFERENCE_DONE {args.expected}' in line:
        done = True
assert done and len(rows) == args.expected, 'Incomplete native QA receipt'
keys = [(r['lesson'], r.get('pair'), r.get('side')) for r in rows]
assert len(set(keys)) == len(rows), 'Duplicate native QA rows'
summary = {'checks': len(rows), 'passed': sum(r['passed'] is True for r in rows),
           'failed': [keys[i] for i, r in enumerate(rows) if r['passed'] is not True]}
receipt = {'scope': 'Native saved-PCM decoder/scoring regressions; synthesized references, not human microphone accuracy',
           'consoleSha256': hashlib.sha256(args.console.read_bytes()).hexdigest(),
           'summary': summary, 'results': rows}
args.output.write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(summary), flush=True)
