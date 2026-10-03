"""Development-only H/F word identification check, never a grade benchmark.

Feed the saved PCM to an unrestricted offline recognizer. No microphone,
network inference, grammar restricted to the displayed pair, or training.
"""
import argparse
import hashlib
import json
from pathlib import Path
import time
import numpy as np
from vosk import Model, KaldiRecognizer, SetLogLevel

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('model', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--contrast-lexicon', action='store_true')
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(ROOT / '.runtime') or args.output.exists():
        parser.error('Fresh private output required')
    data = json.loads(args.input.read_text())
    SetLogLevel(-1)
    model = Model(str(args.model))
    rows = []
    for r in data['rows']:
        vocabulary=['hat','fat','hill','fill','heat','feet','hair','fair','harm','farm','hit','fit',
                    'hear','fear','hall','fall','he','fee','heel','feel','leaf','leave','safe','save',
                    'proof','prove','belief','believe','at','it','ill','eat','air','arm','lee','say',
                    'cat','bat','mat','dog','coat','boat','goat','thin','sin','fin','pin','win',
                    'i','said','again','this','that','the','a','and','no','yes','one','two','three','four',
                    'hello','world','water','book','please','[unk]']
        recognizer = KaldiRecognizer(model, 16000, json.dumps(vocabulary)) if args.contrast_lexicon else KaldiRecognizer(model, 16000)
        recognizer.SetWords(True)
        x = np.clip(np.pad(np.asarray(r['samples']), (5120, 8000)), -1, 1)
        pcm = (x * 32767).astype('<i2').tobytes()
        started = time.monotonic()
        recognizer.AcceptWaveform(pcm)
        result = json.loads(recognizer.FinalResult())
        words = result.get('text', '').split()
        a, b = data['pairs'][r['pair']]
        heard = a if a in words and b not in words else b if b in words and a not in words else None
        rows.append({k: r[k] for k in ['clip', 'speaker', 'split', 'word', 'side', 'pair']} |
                    dict(result=result, heard=heard, correct=heard == r['word'],
                         inferSeconds=time.monotonic()-started))
    def summary(rows):
        return dict(examples=len(rows), speakers=len(set(r['speaker'] for r in rows)),
                    identified=sum(r['correct'] for r in rows),
                    wrong=sum(bool(r['heard']) and not r['correct'] for r in rows),
                    unresolved=sum(not r['heard'] for r in rows))
    report = dict(model=args.model.name, grammar='balanced-course-plus-distractors' if args.contrast_lexicon else 'unrestricted', officialTestUsed=False,
                  inputSha256=hashlib.sha256(args.input.read_bytes()).hexdigest(),
                  summary=summary(rows),
                  bySplit={s:summary([r for r in rows if r['split']==s]) for s in ['train','development']},
                  byWord={w:summary([r for r in rows if r['word']==w]) for w in sorted(set(r['word'] for r in rows))},
                  rows=rows)
    with args.output.open('x') as stream:
        json.dump(report, stream, indent=2, allow_nan=False)
    print(json.dumps({k:v for k,v in report.items() if k!='rows'}))


if __name__=='__main__':
    main()
