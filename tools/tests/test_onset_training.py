"""Small deterministic contracts; no corpus reads, fitting, or encoder inference.

Use the existing ML environment for the optional Torch tests. A base Python with
NumPy can still run corpus-selection/window tests and reports Torch tests skipped.
"""
import importlib.util
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
import numpy as np

SOURCE = Path(__file__).resolve().parents[1] / "onset-model"


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


builder = load("onset_builder_test", SOURCE / "build-dataset.py")
features = load("onset_features_test", SOURCE / "features.py")
dataset_rules = load("onset_dataset_test", SOURCE / "onset_dataset.py")
try:
    import torch
except ImportError:
    trainer = None
else:
    torch.set_num_threads(1)
    with mock.patch.dict("sys.modules", {"features": features, "onset_dataset": dataset_rules}):
        trainer = load("onset_trainer_test", SOURCE / "train.py")


def word(phones, rating, later=2.0, overall=0):
    return {"text": "fixture", "phones": phones, "phones-accuracy": [rating, later],
            "accuracy": overall}


class OnsetDatasetTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        self.patch = mock.patch.object(builder.encoder, "CACHE", self.root)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        split = lambda speaker: int(builder.encoder.digest(("clearpair-v1-" + speaker).encode())[:8], 16) % 5
        self.train = next(str(i) for i in range(1, 100) if split(str(i)) != 0)
        self.dev = next(str(i) for i in range(1, 100) if split(str(i)) == 0)
        self.child, self.missing_age = "child", "missing-age"
        self.mapping = {"101": self.train, "102": self.train, "103": self.train,
                        "104": self.train, "201": self.dev, "202": self.dev,
                        "203": self.dev, "301": self.child, "401": self.missing_age}
        self.scores = {
            "101": {"words": [word(["R", "IY1"], 2)]},
            "102": {"words": [word("L IY1", 2)]},
            # Later phones/overall word accuracy cannot turn a poor initial into
            # an eligible example. A high initial with poor later phones can.
            "103": {"words": [word(["F", "IY1"], .2, later=2, overall=100)]},
            "104": {"words": [word(["HH", "IY1"], 1.8, later=0, overall=0)]},
            "201": {"words": [word(["R", "IY1"], 2)]},
            "202": {"words": [word(["R", "IY1"], 2)]},
            "203": {"words": [word(["F", "IY1"], 1.799)]},
            "301": {"words": [word(["R", "IY1"], 2)]},
            "401": {"words": [word(["R", "IY1"], 2)]},
            "999": {"words": [word(["R", "IY1"], 2)]},
        }
        (self.root / "resource-scores.json").write_text(json.dumps(self.scores))
        self.write_mapping(self.mapping)
        (self.root / "train-spk2age").write_text(f"{self.train} 18\n{self.dev} 42\n{self.child} 17\n")
        (self.root / "test-utt2spk").write_text("999 official-test-person\n")
        (self.root / "test-spk2age").write_text("official-test-person 45\n")

    def write_mapping(self, mapping):
        (self.root / "train-utt2spk").write_text("".join(f"{clip} {person}\n" for clip, person in mapping.items()))

    def test_only_adult_official_train_and_high_initial_experts(self):
        rows = builder.select_rows(10, 10)
        self.assertEqual({row["clip"] for row in rows}, {"101", "102", "104", "201", "202"})
        self.assertEqual({row["speaker"] for row in rows if row["split"] == "train"}, {self.train})
        self.assertEqual({row["speaker"] for row in rows if row["split"] == "development"}, {self.dev})

    def test_caps_rare_priority_and_tie_break_are_deterministic(self):
        expected = builder.select_rows(1, 1)
        self.assertEqual([row["clip"] for row in expected if row["split"] == "train"], ["101"])
        selected_dev = min(["201", "202"], key=lambda clip: builder.encoder.digest(("onset-v1-" + clip).encode()))
        self.assertEqual([row["clip"] for row in expected if row["split"] == "development"], [selected_dev])
        self.write_mapping(dict(reversed(list(self.mapping.items()))))
        self.assertEqual(builder.select_rows(1, 1), expected)

    def test_first_phone_identity_and_stress_suffix(self):
        self.assertEqual(builder.initial({"phones": "HH AH0"}), "HH")
        self.assertEqual(builder.initial({"phones": ["AH0", "L"]}), "AH")
        self.assertIsNone(builder.initial({"phones": []}))

    def test_padded_windows_preserve_center_at_2080_and_edges(self):
        audio = np.arange(10_000, dtype=np.float32)
        middle = builder.padded_window(audio, 3000, np)
        self.assertEqual(middle.shape, (6400,))
        self.assertEqual(middle[0], audio[920])
        self.assertEqual(middle[2080], audio[3000])
        early = builder.padded_window(audio, 100, np)
        np.testing.assert_array_equal(early[:1980], np.zeros(1980))
        self.assertEqual(early[2080], audio[100])
        late = builder.padded_window(audio, 9900, np)
        self.assertEqual(late[2080], audio[9900])
        np.testing.assert_array_equal(late[2180:], np.zeros(4220))

    def test_training_crop_matches_runtime_ctc_coordinate_conversion(self):
        audio = np.linspace(-.5, .5, 10_000, dtype=np.float32)
        for center in [700, 3000, 9700]:
            stored = builder.padded_window(audio, center, np)
            # This is CTC crop parity, not evidence for a physical onset detector.
            runtime_onset_sample = center - 640
            runtime = features.token_window(audio, runtime_onset_sample)
            np.testing.assert_array_equal(stored[800:5600], runtime)
            np.testing.assert_array_equal(features.log_mel(stored[800:5600]), features.log_mel(runtime))


class OnsetDatasetProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)

    def fixture(self, labels=None, reorder=False, shared_speaker=False):
        path = self.root / "dataset.npz"
        labels = np.array([0, 0, 4], dtype=np.int32) if labels is None else labels
        speakers = np.array(["a", "a", "a" if shared_speaker else "b"])
        splits = np.array(["train", "train", "development"])
        np.savez_compressed(path, clips=np.zeros((3, 6400), dtype=np.float32),
                            labels=labels, speakers=speakers, splits=splits)
        examples = [{"clip": "001", "wordIndex": 0, "speaker": "a", "split": "train", "word": "fee",
                     "category": "F", "class": "F", "expertMean": 2.0},
                    {"clip": "001", "wordIndex": 1, "speaker": "a", "split": "train", "word": "food",
                     "category": "F", "class": "F", "expertMean": 2.0},
                    {"clip": "002", "wordIndex": 0, "speaker": str(speakers[2]), "split": "development", "word": "we",
                     "category": "W", "class": "OTHER", "expertMean": 1.8}]
        plan = {"version": dataset_rules.PLAN_VERSION, "classes": dataset_rules.CLASSES, "testSetUsed": False,
                "clips": [{key: row[key] for key in ["clip", "speaker", "split"]} for row in [examples[0], examples[2]]]}
        plan_bytes = json.dumps(plan).encode()
        (self.root / "plan.json").write_bytes(plan_bytes)
        if reorder:
            examples[0], examples[1] = examples[1], examples[0]
        metadata = {"datasetSha256": dataset_rules.digest(path), "planSha256": hashlib.sha256(plan_bytes).hexdigest(),
                    "examples": examples}
        path.with_suffix(".json").write_text(json.dumps(metadata))
        return path

    def test_valid_data_returns_exact_manifest_hashes_and_casts_only_valid_integer_labels(self):
        path = self.fixture()
        loaded = dataset_rules.load_dataset(path)
        self.assertEqual(loaded["labels"].dtype, np.int64)
        self.assertEqual(loaded["datasetMetadataSha256"], dataset_rules.digest(path.with_suffix(".json")))
        self.assertEqual(loaded["datasetPlanSha256"], dataset_rules.digest(self.root / "plan.json"))
        with np.load(path, allow_pickle=False) as source:
            self.assertEqual(source["labels"].dtype, np.int32)

    def test_fractional_and_out_of_range_labels_are_rejected_before_cast(self):
        for labels in [np.array([.5, 0., 4.]), np.array([0., 0., 4.]), np.array([-1, 0, 4]), np.array([0, 0, 5])]:
            with self.subTest(labels=labels), self.assertRaisesRegex(ValueError, "integer class labels"):
                dataset_rules.load_dataset(self.fixture(labels=labels))

    def test_reordered_same_class_same_speaker_metadata_is_detected(self):
        with self.assertRaisesRegex(ValueError, "word order"):
            dataset_rules.load_dataset(self.fixture(reorder=True))

    def test_changed_plan_hash_and_dataset_hash_are_rejected(self):
        path = self.fixture()
        (self.root / "plan.json").write_text((self.root / "plan.json").read_text() + "\n")
        with self.assertRaisesRegex(ValueError, "plan provenance"):
            dataset_rules.load_dataset(path)
        path = self.fixture()
        path.write_bytes(path.read_bytes() + b"changed")
        with self.assertRaisesRegex(ValueError, "Dataset provenance"):
            dataset_rules.load_dataset(path)

    def test_cross_split_speaker_leakage_is_rejected_even_with_consistent_manifests(self):
        with self.assertRaisesRegex(ValueError, "speaker leakage"):
            dataset_rules.load_dataset(self.fixture(shared_speaker=True))

    @unittest.skipIf(trainer is None, "Requires the existing Torch environment")
    def test_trainer_rejects_invalid_data_before_model_creation_or_output_writes(self):
        path = self.fixture(labels=np.array([.5, 0., 4.]))
        output = self.root / "must-not-be-created"
        self.assertIs(trainer.load_dataset, dataset_rules.load_dataset)
        with mock.patch("sys.argv", ["train.py", str(path), str(output)]), mock.patch.object(trainer, "OnsetNet") as create:
            with self.assertRaisesRegex(ValueError, "integer class labels"):
                trainer.main()
            create.assert_not_called()
        self.assertFalse(output.exists())


@unittest.skipIf(trainer is None, "Requires the existing Torch environment; no install is needed")
class OnsetTrainingTests(unittest.TestCase):
    def test_equal_class_mass_and_equal_speaker_mass_within_class(self):
        labels, people = [], []
        for category in range(5):
            labels.extend([category] * (category + 2))
            people.extend(["prolific"] * (category + 1) + ["single"])
        labels, people = np.array(labels), np.array(people)
        weights = trainer.weights(labels, people)
        self.assertEqual(weights.dtype, np.float32)
        self.assertAlmostEqual(float(weights.sum()), len(labels), places=5)
        for category in range(5):
            self.assertAlmostEqual(float(weights[labels == category].sum()), len(labels) / 5, places=5)
            left = weights[(labels == category) & (people == "prolific")].sum()
            right = weights[(labels == category) & (people == "single")].sum()
            self.assertAlmostEqual(float(left), float(right), places=5)

    def test_missing_class_is_not_silently_trained(self):
        with self.assertRaises(ValueError):
            trainer.weights(np.array([0, 1, 2, 3]), np.array(["a"] * 4))

    def test_absent_report_classes_have_unknown_recall(self):
        labels = np.array([0, 0, 1, 1])
        logits = np.array([[3, 1, 0, 0, 0], [0, 3, 0, 0, 0],
                           [0, 3, 0, 0, 0], [0, 0, 0, 0, 3]])
        result = trainer.report(labels, logits)
        self.assertEqual(result["classRecall"], {"F": .5, "HH": .5, "L": None, "R": None, "OTHER": None})
        self.assertEqual(result["accuracy"], .5)
        self.assertEqual(result["balancedAccuracy"], .5)
        self.assertEqual(result["confusionRowsActualColumnsPredicted"][0], [1, 1, 0, 0, 0])
        self.assertEqual(result["confusionRowsActualColumnsPredicted"][1], [0, 1, 0, 0, 1])

    def test_featurizer_preserves_default_shift_and_full_jitter_bounds(self):
        clip = np.linspace(-1, 1, 6400, dtype=np.float32)
        for shift in [-640, 0, 640]:
            with mock.patch.object(trainer, "log_mel", return_value=np.zeros((28, 40), dtype=np.float32)) as extract:
                trainer.featurize(clip[None], shift=shift)
                np.testing.assert_array_equal(extract.call_args.args[0], clip[800+shift:5600+shift])
        for jitter in [-800, 800]:
            rng = mock.Mock()
            rng.integers.return_value = jitter
            rng.uniform.return_value = 1.0
            rng.random.return_value = 1.0
            with mock.patch.object(trainer, "log_mel", return_value=np.zeros((28, 40), dtype=np.float32)) as extract:
                trainer.featurize(clip[None], rng=rng)
                np.testing.assert_array_equal(extract.call_args.args[0], clip[800+jitter:5600+jitter])

    def test_export_schema_and_eval_logits_reconstruct_without_fitting(self):
        torch.manual_seed(52)
        model = trainer.OnsetNet().eval()
        payload = trainer.export(model, {"approved": False, "released": False})
        self.assertEqual(payload["version"], "clearpair-onset-cnn:v1")
        self.assertEqual(payload["features"], features.FEATURE_VERSION)
        self.assertEqual(payload["classes"], ["F", "HH", "L", "R", "OTHER"])
        for layer, shape in {"conv1": (24, 40, 5), "conv2": (24, 24, 5),
                             "fc1": (32, 48), "fc2": (5, 32)}.items():
            self.assertEqual(np.shape(payload[layer]["weight"]), shape)
            self.assertEqual(np.shape(payload[layer]["bias"]), (shape[0],))
            self.assertTrue(np.isfinite(payload[layer]["weight"]).all())
        restored = trainer.OnsetNet().eval()
        decoded = json.loads(json.dumps(payload, allow_nan=False))
        restored.load_state_dict({f"{layer}.{part}": torch.tensor(decoded[layer][part], dtype=torch.float32)
                                  for layer in ["conv1", "conv2", "fc1", "fc2"] for part in ["weight", "bias"]})
        x = np.random.default_rng(52).normal(size=(2, 28, 40)).astype(np.float32)
        expected = trainer.predict(model, x)
        self.assertEqual(expected.shape, (2, 5))
        np.testing.assert_array_equal(trainer.predict(restored, x), expected)


if __name__ == "__main__":
    unittest.main()
