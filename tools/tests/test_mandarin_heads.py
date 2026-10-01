import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("mandarin_heads", Path(__file__).resolve().parents[1]/"compare-mandarin-heads.py")
heads = importlib.util.module_from_spec(spec)
spec.loader.exec_module(heads)
decode_spec = importlib.util.spec_from_file_location("mandarin_audit", Path(__file__).resolve().parents[1]/"audit-mandarin-heads.py")
audit = importlib.util.module_from_spec(decode_spec)
decode_spec.loader.exec_module(audit)


class MandarinDecodeTests(unittest.TestCase):
    def test_repeat_blank_unknown_zero_are_distinct(self):
        vocabulary = {0:"<blank>",1:"<unk>",2:"ZERO",3:"b"}
        runs = audit.decode_runs([0,3,3,0,3,1,1,2,2,0],vocabulary)
        self.assertEqual([r["token"] for r in runs],["b","b","<unk>","ZERO"])
        self.assertEqual([(r["startFrame"],r["endFrameExclusive"]) for r in runs],[(1,3),(4,5),(5,7),(7,9)])

    def test_all_blank_and_empty_do_not_invent_initial(self):
        self.assertEqual(audit.decode_runs([0,0],{0:"<blank>"}),[])
        self.assertEqual(audit.decode_runs([],{0:"<blank>"}),[])


class EvidenceIdentityTest(unittest.TestCase):
    def setUp(self):
        row = dict(clip="00000001",speaker="00000",split="train",text="他",segments=[["t","a"]],labels=[dict(initial=1,final=0)])
        self.plan = dict(officialTestUsed=False,approved=False,rows=[row])
        self.result = {k:row[k] for k in ["clip","speaker","split","text"]}
        self.result["components"] = [dict(head="initial",syllable=0,target="t",label=1,features=[0]*7)]

    def test_matching_development_evidence(self):
        self.assertEqual(len(heads.validated_rows(self.plan,[self.result])),1)

    def test_no_test_or_approved_source(self):
        for field in ["approved","officialTestUsed"]:
            plan = copy.deepcopy(self.plan);plan[field] = True
            with self.assertRaises(ValueError): heads.validated_rows(plan,[self.result])

    def test_changed_rating_or_target(self):
        for field,value in [("target","d"),("label",0),("syllable",1)]:
            result = copy.deepcopy(self.result);result["components"][0][field] = value
            with self.assertRaises(ValueError): heads.validated_rows(self.plan,[result])

    def test_reject_missing_or_duplicate_clips(self):
        for results in [[],[self.result,self.result]]:
            with self.assertRaises(ValueError): heads.validated_rows(self.plan,results)

    def test_reject_speaker_leakage(self):
        row = copy.deepcopy(self.plan["rows"][0]);row.update(clip="00000002",split="development")
        result = copy.deepcopy(self.result);result.update(clip=row["clip"],split=row["split"])
        self.plan["rows"].append(row)
        with self.assertRaises(ValueError): heads.validated_rows(self.plan,[self.result,result])

    def test_reject_duplicate_or_nonfinite_components(self):
        result = copy.deepcopy(self.result);result["components"] *= 2
        with self.assertRaises(ValueError): heads.validated_rows(self.plan,[result])
        result = copy.deepcopy(self.result);result["components"][0]["features"][0] = float("nan")
        with self.assertRaises(ValueError): heads.validated_rows(self.plan,[result])


if __name__ == "__main__":
    unittest.main()
