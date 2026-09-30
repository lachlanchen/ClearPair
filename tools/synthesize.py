#!/usr/bin/env python3
"""Resume-safe reference TTS. Only original public curriculum text is transmitted.

Generated references are synthetic, not human validation data. This tool verifies
decodability/duration, not phonetic correctness. Auditioning remains a release gate.
"""
import asyncio
import hashlib
import json
import subprocess
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
VOICES = {'en-US':'en-US-JennyNeural','zh-CN':'zh-CN-XiaoxiaoNeural','ko-KR':'ko-KR-SunHiNeural','ar-SA':'ar-SA-ZariyahNeural'}

async def main():
    requests = json.loads((ROOT/'.runtime/audio/requests.json').read_text())
    # Edge Read Aloud probes have no verified commercial redistribution grant.
    # Keep these private; release references need a separately reviewed source.
    out = ROOT/'.runtime/audio/edge-reference-probes'
    out.mkdir(parents=True,exist_ok=True)
    manifest_path = out/'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    evidence_path = ROOT/'.runtime/audio/synthesis.json'
    evidence = json.loads(evidence_path.read_text()) if evidence_path.exists() else {}
    voices = {v['ShortName'] for v in await edge_tts.list_voices()}
    for voice in VOICES.values():
        if voice not in voices: raise RuntimeError(f'Voice unavailable: {voice}')
    failures = 0
    for number,item in enumerate(requests,1):
        key = item['key']; voice = VOICES[item['language']]
        digest = hashlib.sha256((voice+'\n'+item['text']).encode()).hexdigest()[:20]
        filename = digest+'.mp3'; target=out/filename
        try:
            if not target.exists():
                partial=out/(filename+'.partial')
                await asyncio.wait_for(edge_tts.Communicate(item['text'],voice,rate='-5%').save(str(partial)),35)
                partial.replace(target)
            check=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(target)],capture_output=True,text=True,check=True)
            seconds=float(check.stdout)
            if not .15 < seconds < 25: raise ValueError('Unexpected reference duration')
            manifest[key]=filename
            evidence[key]={'voice':voice,'duration':seconds,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'auditioned':False,'text':item['text']}
            temporary=manifest_path.with_suffix('.tmp');temporary.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');temporary.replace(manifest_path)
            evidence_path.write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
            print(f'{number}/{len(requests)} {item["language"]} {key} ready',flush=True)
            await asyncio.sleep(.15)
        except Exception as error:
            failures+=1;print(f'{number}/{len(requests)} {key} failed: {type(error).__name__}',flush=True)
            if failures>=3: raise RuntimeError('Stopping after three provider failures; resume later, no retry storm.')
    print(f'Finished: {len(manifest)} available keys; {failures} failures.',flush=True)

if __name__=='__main__':asyncio.run(main())
