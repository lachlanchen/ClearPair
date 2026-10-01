import importlib.util
import itertools
from pathlib import Path
import unittest
import numpy as np

source = Path(__file__).resolve().parents[1] / "qualify-english-scorer.py"
spec = importlib.util.spec_from_file_location("qualify", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AlignmentTest(unittest.TestCase):
    def check_paths(self, probabilities, labels):
        probabilities = np.array(probabilities, dtype=float)
        expected = 0.0
        for path in itertools.product(range(probabilities.shape[1]), repeat=len(probabilities)):
            collapsed = [p for i, p in enumerate(path) if p and (i == 0 or p != path[i - 1])]
            if collapsed == labels:
                expected += np.prod([probabilities[t, p] for t, p in enumerate(path)])
        result = module.align(np.log(probabilities), labels, 0, np)
        if expected == 0:
            self.assertIsNone(result)
            return
        likelihood, occupancy = result
        self.assertAlmostEqual(float(np.exp(likelihood)), expected, places=12)
        self.assertTrue(np.isfinite(occupancy).all())
        self.assertTrue((occupancy >= 0).all())
        self.assertTrue((occupancy.sum(axis=1) <= 1 + 1e-10).all())

    def test_single_phone(self):
        self.check_paths([[.2, .5, .3], [.4, .3, .3], [.5, .2, .3]], [1])

    def test_distinct_phones(self):
        self.check_paths([[.2, .5, .3], [.4, .3, .3], [.5, .2, .3]], [1, 2])

    def test_repeated_phone_needs_blank(self):
        self.check_paths([[.2, .5, .3], [.4, .3, .3], [.5, .2, .3]], [1, 1])

    def test_impossible_repetition(self):
        self.check_paths([[.2, .5, .3], [.4, .3, .3]], [1, 1])


if __name__ == "__main__":
    unittest.main()
