#!/usr/bin/env python3
"""Read WAV payloads from a copied QA simulator IndexedDB, never a live database.

This extracts actual app-written bytes, not seeded recordings. It intentionally
does not claim to decode all WebKit serialization or change any app state.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import sqlite3
import struct
import wave


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--reference", type=Path, required=True)
    args = parser.parse_args()
    import numpy as np
    from scipy.signal import correlate
    args.output.mkdir(parents=True, exist_ok=False)
    def read_audio(data):
        with wave.open(io.BytesIO(data), "rb") as source:
            if (source.getnchannels(), source.getsampwidth(), source.getframerate()) != (1, 2, 16000):
                raise ValueError("Expected mono PCM16/16kHz")
            samples = np.frombuffer(source.readframes(source.getnframes()), dtype="<i2").astype(float)/32768
            return samples
    reference_bytes = args.reference.read_bytes()
    reference = read_audio(reference_bytes)
    reference -= reference.mean()
    connection = sqlite3.connect(args.database.resolve().as_uri() + "?mode=ro", uri=True)
    # WebKit's IDBKEY collation isn't provided by system SQLite. Do not install
    # a fake comparator and call an index integrity check a validation. Read
    # only record payloads by integer row identity, independent of those indexes.
    if connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Records'").fetchone() is None:
        raise ValueError("Missing recording object store")
    report = dict(databaseSha256=hashlib.sha256(args.database.read_bytes()).hexdigest(),
        referenceSha256=hashlib.sha256(reference_bytes).hexdigest(),
        scope="Actual simulator app recording bytes; virtual loopback, not physical microphone", rows=[])
    for record, blob in connection.execute("SELECT recordID, value FROM Records ORDER BY recordID"):
        if not isinstance(blob, bytes):
            continue
        start = blob.find(b"RIFF")
        if start < 0:
            continue
        if blob[start+8:start+12] != b"WAVE":
            raise ValueError("Unrecognized RIFF record")
        size = struct.unpack_from("<I", blob, start+4)[0] + 8
        if not 44 <= size <= len(blob)-start:
            raise ValueError("Truncated saved WAV")
        data = blob[start:start+size]
        samples = read_audio(data)
        if len(samples) < len(reference):
            raise ValueError("Saved take shorter than fixture")
        correlation = correlate(samples, reference, mode="valid", method="fft")
        n = len(reference)
        squares = np.r_[0., np.cumsum(samples*samples)]
        sums = np.r_[0., np.cumsum(samples)]
        centered_energy = squares[n:] - squares[:-n] - (sums[n:] - sums[:-n])**2/n
        denominator = np.sqrt(np.maximum(0, centered_energy) * float(reference@reference))
        normalized = np.divide(correlation, denominator, out=np.zeros_like(correlation), where=denominator>1e-12)
        at = int(np.argmax(np.abs(normalized)))
        file = args.output / f"record-{record}.wav"
        with file.open("xb") as stream:
            stream.write(data)
        report["rows"].append(dict(recordID=record, file=file.name, bytes=size,
            sha256=hashlib.sha256(data).hexdigest(), seconds=len(samples)/16000,
            rmsDbFS=float(20*np.log10(max(1e-12, np.sqrt(np.mean(samples*samples))))),
            nonzeroFraction=float(np.mean(samples != 0)),
            referenceLagSeconds=at/16000, referenceCorrelation=float(normalized[at])))
    connection.close()
    with (args.output / "report.json").open("x") as stream:
        json.dump(report, stream, indent=2, allow_nan=False)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
