"""Run the reference beta plumbing probe on only the owned headless simulator."""
import hashlib, json, os, pathlib, signal, subprocess, time
root=pathlib.Path.cwd()
assert root==pathlib.Path('/Users/lachlan/Projects/ClearPair')
sim='7E3C0832-280A-4245-AB3F-4A464C0E7B7D'
bundle='art.lazying.clearpair.qa.modelios'
qa=root/'.runtime/ios-model-qa'
app=qa/'reference-derived/Build/Products/Debug-iphonesimulator/App.app'
hashes=json.loads((qa/'asset-hashes.json').read_text())
assert set(hashes)=={'index.html','probe.js','reference-score.worker.js'}
for name,digest in hashes.items():
    assert len(digest)==64 and hashlib.sha256((app/'public'/name).read_bytes()).hexdigest()==digest, 'QA asset transfer mismatch: '+name
devices=json.loads(subprocess.check_output(['xcrun','simctl','list','devices','--json']))
device=next(d for group in devices['devices'].values() for d in group if d['udid']==sim)
assert device['name'].startswith('ClearPair-Audio-QA-') and device['state']=='Shutdown'
out=qa/('reference-result-'+time.strftime('%Y%m%d-%H%M%S'));out.mkdir()
process=None
try:
    subprocess.run(['codesign','--force','--deep','--sign','-',str(app)],check=True)
    subprocess.run(['xcrun','simctl','boot',sim],check=True)
    subprocess.run(['xcrun','simctl','bootstatus',sim,'-b'],check=True,timeout=120)
    subprocess.run(['xcrun','simctl','install',sim,str(app)],check=True,timeout=30)
    log=out/'console.log'
    with log.open('xb') as stream:
        process=subprocess.Popen(['xcrun','simctl','launch','--console-pty',sim,bundle],stdout=stream,stderr=subprocess.STDOUT,start_new_session=True)
        deadline=time.monotonic()+230
        while time.monotonic()<deadline:
            text=log.read_text(errors='replace')
            rows=[]
            for line in text.splitlines():
                if 'CLEARPAIR_REFERENCE_ROW ' not in line: continue
                try: row,_=json.JSONDecoder().raw_decode(line.split('CLEARPAIR_REFERENCE_ROW ',1)[1].lstrip())
                except json.JSONDecodeError: continue
                rows.append(row)
            expected=os.environ.get('CLEARPAIR_QA_ROWS','8')
            if expected=='auto':
                begin=[line.split('CLEARPAIR_REFERENCE_BEGIN ',1)[1].strip() for line in text.splitlines() if 'CLEARPAIR_REFERENCE_BEGIN ' in line]
                expected=begin[-1].split()[0] if begin else '0'
                assert 0<=int(expected)<=120
            if int(expected)>0 and len(rows)==int(expected):
                result={'scope':'Native synthesis and algorithm plumbing, not human pronunciation accuracy','assetSha256':hashes,'results':rows}
                (out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
                print(json.dumps(result),flush=True);break
            if process.poll() is not None: raise RuntimeError('QA app exited')
            time.sleep(.5)
        else: raise RuntimeError('Reference probe timed out')
    subprocess.run(['xcrun','simctl','io',sim,'screenshot',str(out/'result.png')],check=True,timeout=20)
finally:
    subprocess.run(['xcrun','simctl','terminate',sim,bundle],capture_output=True,timeout=15)
    if process and process.poll() is None:
        os.killpg(process.pid,signal.SIGTERM)
        try: process.wait(timeout=10)
        except subprocess.TimeoutExpired: os.killpg(process.pid,signal.SIGKILL)
    subprocess.run(['xcrun','simctl','shutdown',sim],check=True,timeout=30)
