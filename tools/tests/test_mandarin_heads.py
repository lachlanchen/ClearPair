import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location("mandarin_audit",Path(__file__).parents[1]/"audit-mandarin-heads.py")
audit=importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class MandarinDecodeTests(unittest.TestCase):
    def test_repeat_blank_unknown_zero_are_distinct(self):
        vocabulary={0:"<blank>",1:"<unk>",2:"ZERO",3:"b"}
        runs=audit.decode_runs([0,3,3,0,3,1,1,2,2,0],vocabulary)
        self.assertEqual([r["token"] for r in runs],["b","b","<unk>","ZERO"])
        self.assertEqual([(r["startFrame"],r["endFrameExclusive"]) for r in runs],[(1,3),(4,5),(5,7),(7,9)])

    def test_all_blank_and_empty_do_not_invent_initial(self):
        self.assertEqual(audit.decode_runs([0,0],{0:"<blank>"}),[])
        self.assertEqual(audit.decode_runs([],{0:"<blank>"}),[])


if __name__=="__main__":unittest.main()
