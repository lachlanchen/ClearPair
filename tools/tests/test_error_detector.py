import importlib.util
from pathlib import Path
import unittest
import json
import tempfile
import numpy as np

spec = importlib.util.spec_from_file_location("error_detector", Path(__file__).resolve().parents[1]/"train-error-detector.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ErrorDetectorTests(unittest.TestCase):
    def test_equal_classes_and_speakers_not_equal_utterance_counts(self):
        y = np.array([0,0,0,1,1,1,1]); s = np.array(["a","a","b","a","a","a","b"])
        w = module.balanced_weights(y,s,np)
        self.assertAlmostEqual(w[y==0].sum(),w[y==1].sum())
        for label in [0,1]:
            self.assertAlmostEqual(w[(y==label)&(s=="a")].sum(),w[(y==label)&(s=="b")].sum())
        self.assertAlmostEqual(w.sum(),len(y))

    def test_missing_error_examples_refused(self):
        with self.assertRaises(ValueError):
            module.balanced_weights(np.array([1,1]),np.array(["a","b"]),np)

    def test_threshold_includes_equal_statistic(self):
        report=module.decision_report(np.array([0,1]),np.array([.8,.79]),.8,np)
        self.assertEqual(report["falseAccept"],1)
        self.assertEqual(report["falseReject"],1)

    def test_no_observed_errors_is_not_zero_risk(self):
        report=module.decision_report(np.array([1]),np.array([.9]),.8,np)
        self.assertIsNone(report["falseAccept"])
        self.assertIsNone(report["falseAcceptPhoneWilson95"])
        interval=module.wilson_interval(0,18)
        self.assertGreater(interval[1],.17)

    def test_partial_expansion_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)
            (path/"plan.json").write_text(json.dumps({"clips": 3, "splits": {
                "train": {"clips": 2}, "development": {"clips": 1}}}))
            with self.assertRaises(ValueError):
                module.check_expansion_complete(path, {"train": 1, "development": 1})
            module.check_expansion_complete(path, {"train": 2, "development": 1})

    def test_portable_tree_exact_threshold_and_no_missing_value_guess(self):
        artifact={"features":1,"baseline":0,"trees":[[
            {"feature":0,"threshold":.5,"left":1,"right":2}, {"value":-2}, {"value":2}]]}
        self.assertLess(module.portable_prediction(artifact,[.5]),.2)
        self.assertGreater(module.portable_prediction(artifact,[.5001]),.8)
        for values in [[],[float('nan')],[float('inf')]]:
            with self.assertRaises(ValueError):module.portable_prediction(artifact,values)

    def test_portable_export_matches_original_boosted_classifier(self):
        from sklearn.ensemble import HistGradientBoostingClassifier
        x=np.random.default_rng(42).normal(size=(180,3))
        y=(x[:,0]*x[:,1]+x[:,2]>.2).astype(int)
        model=HistGradientBoostingClassifier(max_iter=12,max_leaf_nodes=5,early_stopping=False).fit(x,y)
        artifact=module.export_nonlinear(model,3)
        portable=np.array([module.portable_prediction(artifact,row) for row in x])
        np.testing.assert_allclose(portable,model.predict_proba(x)[:,1],rtol=0,atol=1e-12)


if __name__=="__main__":unittest.main()
