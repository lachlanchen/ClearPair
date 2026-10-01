import json
from pathlib import Path
import plistlib
import subprocess
import sys
import tempfile
import unittest

TOOL = Path(__file__).resolve().parents[1]/"ios-qa/prepare-device-plan.py"


class DevicePlanTests(unittest.TestCase):
    def test_new_config_keeps_built_paths_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            built = root/"built.xctestrun"; plan = root/"plan.json"; output = root/"new.xctestrun"
            original = {"ClearPairUITests": {"EnvironmentVariables": {"EXISTING": "keep"},
                         "TestBundlePath": "__TESTROOT__/helper"}}
            built.write_bytes(plistlib.dumps(original))
            plan.write_text(json.dumps([{"action": "inspect"}]))
            result = subprocess.run([sys.executable,str(TOOL),str(built),str(plan),str(output)],capture_output=True)
            self.assertEqual(result.returncode,0,result.stderr)
            parsed=plistlib.loads(output.read_bytes())["ClearPairUITests"]
            self.assertEqual(parsed["TestBundlePath"],"__TESTROOT__/helper")
            self.assertEqual(parsed["EnvironmentVariables"]["EXISTING"],"keep")
            self.assertEqual(parsed["OnlyTestIdentifiers"],["DeviceUITests/testObservedSequence"])
            self.assertEqual(plistlib.loads(built.read_bytes()),original)
            again=subprocess.run([sys.executable,str(TOOL),str(built),str(plan),str(output)],capture_output=True)
            self.assertNotEqual(again.returncode,0)

    def test_output_cannot_break_testroot(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            result=subprocess.run([sys.executable,str(TOOL),str(root/"built.xctestrun"),
                                   str(root/"plan.json"),str(root/"elsewhere/out.xctestrun")],capture_output=True)
            self.assertNotEqual(result.returncode,0)
            self.assertIn(b"Output must remain beside",result.stderr)


if __name__=="__main__":unittest.main()
