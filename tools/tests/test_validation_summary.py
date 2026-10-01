import importlib.util
from pathlib import Path
import unittest

source = Path(__file__).resolve().parents[1] / "summarize-human-validation.py"
spec = importlib.util.spec_from_file_location("validation_summary", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SummaryTest(unittest.TestCase):
    def test_zero_errors_is_not_certain_perfection(self):
        lo, hi = module.wilson(0, 10)
        self.assertAlmostEqual(lo, 0)
        self.assertGreater(hi, .27)
        self.assertLess(hi, .29)

    def test_empty_denominator_is_unknown(self):
        self.assertIsNone(module.wilson(0, 0))

    def test_exact_fixed_threshold_and_brier(self):
        rows = [{"speaker": "a", "expertMean": 2, "probability": .8},
                {"speaker": "b", "expertMean": 0, "probability": .8}]
        result = module.summarize(rows, .8)
        self.assertEqual(result["falseAccept"], 1)
        self.assertEqual(result["falseReject"], 0)
        self.assertAlmostEqual(result["brier"], .34)
        self.assertAlmostEqual(result["ece10EqualWidth"], .3)
        self.assertFalse(result["sampleMinimumsMet"])

    def test_intermediate_labels_refused(self):
        with self.assertRaises(ValueError):
            module.summarize([{"speaker": "a", "expertMean": 1, "probability": .8}], .8)

    def test_invalid_probability_refused(self):
        with self.assertRaises(ValueError):
            module.summarize([{"speaker": "a", "expertMean": 2, "probability": float("nan")}], .8)


if __name__ == "__main__":
    unittest.main()
