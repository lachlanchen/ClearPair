#!/usr/bin/env python3
"""Extract bounded JSON QA rows, never the native console's audio payloads."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('console', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--expected', type=int, required=True)
args = parser.parse_args()
assert 1 <= args.expected <= 120
rows = []
parts = {}
done = False
for line in args.console.read_text(errors='replace').splitlines():
    chunk = re.search(r'CLEARPAIR_REFERENCE_PART (\d+) (\d+) (\d+) ([A-Za-z0-9+/=]+) END', line)
    if chunk:
        index, part, count = map(int, chunk.group(1, 2, 3))
        assert 0 <= index < args.expected and 0 <= part < count <= 100
        entry = parts.setdefault(index, {'count': count, 'chunks': {}})
        assert entry['count'] == count and part not in entry['chunks'], 'Duplicate or inconsistent receipt chunk'
        entry['chunks'][part] = chunk.group(4)
    if 'CLEARPAIR_REFERENCE_ROW ' in line:
        row, _ = json.JSONDecoder().raw_decode(line.split('CLEARPAIR_REFERENCE_ROW ', 1)[1].lstrip())
        rows.append(row)
    if f'CLEARPAIR_REFERENCE_DONE {args.expected}' in line:
        done = True
if parts:
    assert not rows and set(parts) == set(range(args.expected)), 'Missing or mixed receipt rows'
    for index in range(args.expected):
        entry = parts[index]
        assert set(entry['chunks']) == set(range(entry['count'])), 'Incomplete receipt chunks'
        encoded = ''.join(entry['chunks'][i] for i in range(entry['count']))
        rows.append(json.loads(base64.b64decode(encoded, validate=True).decode('utf-8')))
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
