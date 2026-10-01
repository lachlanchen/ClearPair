import importlib.util
import copy
from pathlib import Path
import unittest
from unittest import mock
import numpy as np

spec = importlib.util.spec_from_file_location("onset_confidence", Path(__file__).resolve().parents[1] / "onset-model/audit-confidence.py")
audit = importlib.util.module_from_spec(spec)
dataset_spec = importlib.util.spec_from_file_location("onset_dataset_confidence_test", Path(__file__).resolve().parents[1] / "onset-model/onset_dataset.py")
dataset_rules = importlib.util.module_from_spec(dataset_spec)
dataset_spec.loader.exec_module(dataset_rules)
with mock.patch.dict("sys.modules", {"onset_dataset": dataset_rules}):
    spec.loader.exec_module(audit)


class ConfidenceAuditTests(unittest.TestCase):
    def identities(self):
        examples = [{"clip": "001", "wordIndex": 0, "speaker": "a", "split": "train", "word": "fee",
                     "category": "F", "class": "F", "expertMean": 2.0},
                    {"clip": "002", "wordIndex": 0, "speaker": "b", "split": "development", "word": "we",
                     "category": "W", "class": "OTHER", "expertMean": 1.8}]
        plan = {"version": dataset_rules.PLAN_VERSION, "classes": audit.CLASSES, "testSetUsed": False, "clips": [
            {k: row[k] for k in ["clip", "speaker", "split"]} for row in examples]}
        return examples, plan

    def test_full_metadata_scope_matches_integer_labels_and_plan(self):
        examples, plan = self.identities()
        self.assertIs(audit.load_dataset, dataset_rules.load_dataset)
        self.assertIs(audit.validate_identities, dataset_rules.validate_identities)
        audit.validate_identities(np.array([0, 4]), np.array(["a", "b"]), np.array(["train", "development"]), examples, plan)
        for labels in [np.array([-1, 4]), np.array([0, 5]), np.array([0., 4.]), np.array([.5, 4.])]:
            with self.assertRaises(ValueError):
                audit.validate_identities(labels, np.array(["a", "b"]), np.array(["train", "development"]), examples, plan)

    def test_changed_metadata_identity_or_expert_scope_is_rejected(self):
        examples, plan = self.identities()
        for key, value in [("clip", "unplanned"), ("speaker", "different"), ("split", "test"),
                           ("wordIndex", -.5), ("category", "F"), ("expertMean", 1.79), ("expertMean", float("nan"))]:
            changed = copy.deepcopy(examples)
            changed[1][key] = value
            with self.assertRaises(ValueError):
                audit.validate_identities(np.array([0, 4]), np.array(["a", "b"]), np.array(["train", "development"]), changed, plan)

    def test_duplicate_word_and_wrong_parity_identity_are_rejected(self):
        examples, plan = self.identities()
        with self.assertRaises(ValueError):
            audit.validate_identities(np.array([0, 0, 4]), np.array(["a", "a", "b"]), np.array(["train", "train", "development"]), [examples[0], examples[0], examples[1]], plan)
        audit.validate_parity_identity({"clip": "002", "wordIndex": 0}, examples[1])
        with self.assertRaises(ValueError):
            audit.validate_parity_identity({"clip": "002", "wordIndex": 1}, examples[1])

    def test_all_actual_negatives_remain_in_denominators(self):
        labels = np.array([0, 1, 2, 3, 4, 4])
        p = np.array([[.8, .05, .05, .05, .05], [.7, .2, .03, .03, .04],
                      [.8, .05, .05, .05, .05], [.05, .05, .05, .8, .05],
                      [.05, .8, .05, .05, .05], [.05, .05, .05, .05, .8]])
        row = audit.decisions(labels, p, np.array(["a", "a", "a", "b", "b", "b"]), (0, 1), .6)
        self.assertEqual(row["positiveAccepted"]["count"], 2)
        self.assertEqual(row["positiveCorrect"]["count"], 1)
        self.assertEqual(row["outOfContrastFalseAccept"]["count"], 2)
        self.assertEqual(row["outOfContrastFalseAccept"]["total"], 4)
        self.assertEqual(row["acceptedWrong"]["count"], 3)
        self.assertEqual(row["acceptedWrong"]["total"], 4)
        self.assertEqual(row["otherFalseAccept"]["count"], 1)
        self.assertEqual(row["otherFalseAccept"]["total"], 2)
        self.assertEqual(row["speakersWithOutOfContrastFalseAccept"]["count"], 2)

    def test_pair_only_renormalization_cannot_fake_confidence(self):
        p = np.array([[.45, .05, .1, .1, .3]])
        row = audit.decisions(np.array([4]), p, np.array(["speaker"]), (0, 1), .8)
        self.assertEqual(row["outOfContrastFalseAccept"]["count"], 0)
        self.assertEqual(row["acceptedWrong"]["total"], 0)
        self.assertIsNone(row["acceptedWrong"]["rate"])

    def test_threshold_equality_is_included_and_runnerup_is_any_class(self):
        p = np.array([[.6, .05, .05, 0, .3]])
        row = audit.decisions(np.array([0]), p, np.array(["speaker"]), (0, 1), .6, .3)
        self.assertEqual(row["positiveAccepted"]["count"], 1)
        rejected = audit.decisions(np.array([0]), p, np.array(["speaker"]), (0, 1), .6, .31)
        self.assertEqual(rejected["positiveAccepted"]["count"], 0)

    def test_zero_observed_errors_do_not_imply_zero_risk(self):
        interval = audit.wilson(0, 5)
        self.assertGreater(interval[1], .4)
        self.assertIsNone(audit.wilson(0, 0))
        with self.assertRaises(ValueError):
            audit.wilson(6, 5)

    def test_softmax_is_stable_and_rejects_nonfinite_logits(self):
        p = audit.probabilities([[1000, 999, 998, 997, 996]])
        self.assertAlmostEqual(float(p.sum()), 1.)
        self.assertEqual(int(p.argmax()), 0)
        with self.assertRaises(ValueError):
            audit.probabilities([[0, 0, float("nan"), 0, 0]])


if __name__ == "__main__":
    unittest.main()
