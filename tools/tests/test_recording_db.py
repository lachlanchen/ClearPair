"""Extractor fixtures prove byte integrity/read-only behavior, not microphone QA."""
import hashlib
import io
import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest
import wave

import numpy as np

SCRIPT = Path(__file__).resolve().parents[1] / "ios-qa/inspect-recording-db.py"


def wav(samples, channels=1):
    stream = io.BytesIO()
    with wave.open(stream, "wb") as output:
        output.setnchannels(channels); output.setsampwidth(2); output.setframerate(16000)
        output.writeframes(np.asarray(samples, dtype="<i2").tobytes())
    return stream.getvalue()


class RecordingDatabaseTest(unittest.TestCase):
    def fixture(self, folder, payload, channels=1):
        t = np.arange(8000)/16000
        reference = wav((12000*np.sin(2*np.pi*(250*t+300*t*t))).astype(np.int16), channels)
        path = folder / "reference.wav"; path.write_bytes(reference)
        database = folder / "copy.sqlite3"
        with sqlite3.connect(database) as db:
            db.create_collation("IDBKEY", lambda a,b:(a>b)-(a<b))
            db.execute("CREATE TABLE Records (recordID INTEGER PRIMARY KEY, key TEXT COLLATE IDBKEY, value BLOB)")
            db.execute("CREATE INDEX keys ON Records(key)")
            db.execute("INSERT INTO Records VALUES (1,'recording',?)", (payload(reference),))
        return database, path

    def run_probe(self, database, reference, output):
        return subprocess.run([sys.executable,str(SCRIPT),str(database),str(output),"--reference",str(reference)],
            capture_output=True,text=True,timeout=15)

    def test_actual_payload_extraction_preserves_database_and_wav(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder=Path(temporary)
            database,reference=self.fixture(folder,lambda data:b"webkit-prefix"+data+b"suffix")
            before=hashlib.sha256(database.read_bytes()).hexdigest()
            result=self.run_probe(database,reference,folder/"out")
            self.assertEqual(result.returncode,0,result.stderr)
            report=json.loads(result.stdout)
            self.assertEqual(len(report["rows"]),1)
            self.assertAlmostEqual(report["rows"][0]["referenceCorrelation"],1,places=10)
            self.assertEqual((folder/"out/record-1.wav").read_bytes(),reference.read_bytes())
            self.assertEqual(hashlib.sha256(database.read_bytes()).hexdigest(),before)

    def test_truncated_blob_is_not_accepted(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder=Path(temporary)
            database,reference=self.fixture(folder,lambda data:data[:-10])
            result=self.run_probe(database,reference,folder/"out")
            self.assertNotEqual(result.returncode,0)
            self.assertIn("Truncated saved WAV",result.stderr)

    def test_no_overwrite_of_previous_extraction(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder=Path(temporary)
            database,reference=self.fixture(folder,lambda data:data)
            output=folder/"out"; output.mkdir()
            sentinel=output/"keep"; sentinel.write_text("previous evidence")
            result=self.run_probe(database,reference,output)
            self.assertNotEqual(result.returncode,0)
            self.assertEqual(sentinel.read_text(),"previous evidence")


if __name__ == "__main__":
    unittest.main()
