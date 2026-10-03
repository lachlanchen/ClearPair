"""Extract private synthetic PCM fixtures. Never a shipped voice or human test."""
import argparse,base64,json,re
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('console',type=Path);p.add_argument('output',type=Path);p.add_argument('--app',required=True);a=p.parse_args()
assert a.app in ('japanese','korean','arabic','cantonese')
parts={};total=None
for line in a.console.read_text(errors='replace').splitlines():
 m=re.search(r'CLEARPAIR_FIXTURE_PART (\d+) (\d+) ([A-Za-z0-9+/=]+) END',line)
 if not m:continue
 i,n=int(m[1]),int(m[2]);assert 0<=i<n<=50000 and i not in parts
 assert total is None or total==n;total=n;parts[i]=m[3]
assert total and set(parts)==set(range(total)), 'Incomplete fixture transfer'
result=json.loads(base64.b64decode(''.join(parts[i] for i in range(total)),validate=True))
assert result['app']==a.app and result['scope']=='Synthetic private QA only; not shipped voices or microphone evidence'
assert 1<=len(result['references'])<=600
keys=[]
for r in result['references']:
 keys.append((r['text'],r['language']));b=base64.b64decode(r['pcm16Base64'],validate=True)
 assert 3200<=len(b)<=432000 and len(b)%2==0
assert len(set(keys))==len(keys)
a.output.write_text(json.dumps(result,separators=(',',':'))+'\n')
print(json.dumps({'app':a.app,'privateSyntheticReferences':len(keys),'bytes':a.output.stat().st_size}))
