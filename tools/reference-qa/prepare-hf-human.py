"""Read-only TRAIN-corpus word-identification regression for H & F.

Expert-high phones supply word labels. Cached CTC supplies crop proposals only.
No model training, downloads, consumed official TEST, or release approval.
Output is private generated evidence; corpus audio is never bundled in an app.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / '.runtime/benchmarks/speechocean762'
SOURCE = ROOT / '.runtime/model-audit/english-onset-v1'
PAIRS = [('hat','fat'),('hill','fill'),('heat','feet'),('hair','fair'),
         ('harm','farm'),('hit','fit'),('hear','fear'),('hall','fall'),
         ('he','fee'),('heel','feel')]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if not args.out.resolve().is_relative_to(ROOT / '.runtime') or args.out.exists():
        parser.error('Fresh private evidence destination required')
    spec = importlib.util.spec_from_file_location('alignment', ROOT / 'tools/qualify-english-scorer.py')
    alignment = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(alignment)
    adapter = json.loads((alignment.MODEL / 'regression.json').read_text())
    metadata = json.loads((SOURCE / 'dataset.json').read_text())
    scores = json.loads((CACHE / 'resource-scores.json').read_text())
    mapping = dict(line.split() for line in (CACHE / 'train-utt2spk').read_text().splitlines())
    allowed = {word:(i,side) for i,pair in enumerate(PAIRS) for side,word in enumerate(pair)}
    rows = []
    skipped = {}
    for example in metadata['examples']:
        word = example['word'].lower()
        if word not in allowed:
            continue
        clip, speaker, wi = example['clip'], example['speaker'], example['wordIndex']
        if mapping[clip] != speaker or example['expertMean'] < 1.8:
            raise ValueError('Human label identity mismatch')
        annotation = scores[clip]['words']
        if min(annotation[wi]['phones-accuracy']) < 1.8:
            skipped['other-phone-not-expert-high'] = skipped.get('other-phone-not-expert-high',0)+1
            continue
        audio = CACHE / 'audio' / (clip+'.wav')
        audio_hash = hashlib.sha256(audio.read_bytes()).hexdigest()
        if audio_hash != example['audioSha256']:
            raise ValueError('Human source hash mismatch')
        emissions = np.load(SOURCE / (clip+'-emissions.npz'), allow_pickle=False)
        if str(emissions['audioSha256']) != audio_hash or str(emissions['modelSha256']) != alignment.MODEL_SHA:
            raise ValueError('Cached alignment source mismatch')
        raw = emissions['logits'].astype(np.float64)
        raw -= raw.max(axis=1,keepdims=True)
        frames = raw-np.log(np.exp(raw).sum(axis=1,keepdims=True))
        blank = adapter['blank']
        frames[:,blank] = np.logaddexp.reduce(frames[:,[blank,*adapter['separators']]],axis=1)
        frames[:,adapter['separators']] = -np.inf
        labels, offsets = [], []
        for item in annotation:
            offsets.append(len(labels))
            phones = item['phones'] if isinstance(item['phones'],list) else item['phones'].split()
            labels.extend(adapter['vocabulary'][alignment.IPA[p.rstrip('012')]] for p in phones)
        aligned = alignment.align(frames,labels,blank,np)
        if aligned is None:
            continue
        weights = aligned[1]
        first, last = offsets[wi], (offsets[wi+1] if wi+1 < len(offsets) else len(labels))-1
        def quantile(at,q):
            mass = weights[:,at].sum()
            if mass <= 1e-8:
                raise ValueError('No crop alignment mass')
            return int(np.searchsorted(np.cumsum(weights[:,at]/mass),q))*320+200
        start,end = max(0,quantile(first,.05)-320),quantile(last,.95)+480
        decoded = subprocess.check_output(['ffmpeg','-nostdin','-v','error','-i',str(audio),'-f','f32le','-ar','16000','-ac','1','pipe:1'])
        pcm = np.frombuffer(decoded,dtype='<f4')[start:end].copy()
        if not 1600 <= len(pcm) <= 32000:
            continue
        pair,side = allowed[word]
        rows.append(dict(clip=clip,speaker=speaker,split=example['split'],word=word,pair=pair,side=side,
                         audioSha256=audio_hash,crop=[start,end],samples=pcm.tolist()))
    references = {}
    for word in allowed:
        wav = subprocess.check_output(['espeak-ng','-v','en-us','-s','145','--stdout',word])
        pcm = subprocess.check_output(['ffmpeg','-nostdin','-v','error','-i','pipe:0','-f','f32le','-ar','16000','-ac','1','pipe:1'],input=wav)
        references[word] = np.frombuffer(pcm,dtype='<f4').tolist()
    result = dict(scope='Human correct-word identification regression, NOT learner-error accuracy validation',
                  officialTestUsed=False,trainedModel=False,referenceVoice='espeak-ng/en-us/145',
                  corpusRevision='613968e3b0b789fc33936fb5eba1973176ba7d11',pairs=PAIRS,rows=rows,references=references,skipped=skipped)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open('x') as stream:
        json.dump(result,stream,separators=(',',':'),allow_nan=False)
    print(json.dumps(dict(examples=len(rows),speakers=len({r['speaker'] for r in rows}),skipped=skipped,
                         sha256=hashlib.sha256(args.out.read_bytes()).hexdigest())))


if __name__ == '__main__':
    main()
