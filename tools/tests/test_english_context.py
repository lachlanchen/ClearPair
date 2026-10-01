"""Numerical/semantic checks; these are not human pronunciation validation."""
import itertools
from pathlib import Path
import sys
import unittest

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from english_context_model import (ARPABET, BLANK, collapse_path, edit_likelihoods,
                                    free_alignment, lexical_log_probabilities)
from ctc_edit_evidence import context_edits


class EnglishContextTest(unittest.TestCase):
    def test_inventory_keeps_real_distinctions(self):
        self.assertNotEqual(ARPABET["AO"], ARPABET["AA"])
        self.assertNotEqual(ARPABET["ZH"], ARPABET["SH"])
        self.assertEqual(len(set(ARPABET.values())), len(ARPABET))
        self.assertNotIn(BLANK, ARPABET.values())

    def test_silence_merge_preserves_probability(self):
        logits = np.arange(138, dtype=float).reshape(3, 46) / 20
        output = lexical_log_probabilities(logits, np)
        np.testing.assert_allclose(np.exp(output).sum(axis=1), 1)
        self.assertTrue(np.isneginf(output[:, 0]).all())
        self.assertTrue(np.isfinite(output[:, BLANK]).all())

    def test_invalid_logits(self):
        with self.assertRaises(ValueError):
            lexical_log_probabilities(np.zeros((4, 45)), np)
        x = np.zeros((4, 46)); x[0, 0] = np.nan
        with self.assertRaises(ValueError):
            lexical_log_probabilities(x, np)

    def test_repeat_blank_semantics(self):
        self.assertEqual(collapse_path([7, 7, BLANK, 7, 9, 9]), [7, 7, 9])

    def test_free_alignment(self):
        self.assertEqual(free_alignment([7, 29, 23], [9, 29, 23]), ([9, 29, 23], 1/3))
        self.assertEqual(free_alignment([7, 29, 23], [29, 23]), ([None, 29, 23], 1/3))
        self.assertEqual(free_alignment([7], []), ([None], 1))
        self.assertEqual(free_alignment([], [7]), ([], 1))

    def test_edit_ctc_matches_enumerated_paths(self):
        # Exhaustive three-frame paths with two phones and blank, including the
        # adjacent-equal case where deleting the middle phone changes repeats.
        probability = np.zeros((3, 46))
        probability[:, [7, 9, BLANK]] = [[.6, .3, .1], [.1, .5, .4], [.4, .2, .4]]
        with np.errstate(divide="ignore"):
            frames = np.log(probability)
        labels = [7, 9, 7]
        result = edit_likelihoods(frames, labels, 1, torch)
        masses = {}
        for path in itertools.product([7, 9, BLANK], repeat=3):
            key = tuple(collapse_path(path))
            masses[key] = masses.get(key, 0) + np.prod([probability[t, p] for t, p in enumerate(path)])
        for token in range(1, BLANK):
            expected = masses.get((7, token, 7), 0)
            self.assertAlmostEqual(float(np.exp(result[token-1])), expected, places=12)
        self.assertAlmostEqual(float(np.exp(result[-1])), masses.get((7, 7), 0), places=12)

    def test_target_does_not_win_by_forced_boundaries(self):
        logits = np.full((8, 46), -20.)
        logits[:3, 9] = 5; logits[3:6, 29] = 5; logits[6:, 23] = 5
        result = edit_likelihoods(lexical_log_probabilities(logits, np), [7, 29, 23], 0, torch)
        self.assertGreater(result[9-1], result[7-1] + 10)

    def test_non_english_zero_initial_is_not_blank(self):
        with np.errstate(divide="ignore"):
            frames = np.log(np.array([[.1, 0, .8, .1], [.6, 0, .3, .1]]))
        result = context_edits(frames, [2], 0, [2, 3], 0, torch)
        # P(ZERO) = ZERO/ZERO + ZERO/blank + blank/ZERO.
        self.assertAlmostEqual(np.exp(result[0]), .8*.3 + .8*.6 + .1*.3)
        self.assertAlmostEqual(np.exp(result[-1]), .1*.6)

    def test_invalid_inventory_and_context(self):
        frames = np.log(np.full((3, 4), .25))
        for inventory, blank in [([2, 2], 0), ([0, 2], 0), ([2, 4], 0), ([2], 8)]:
            with self.assertRaises(ValueError):
                context_edits(frames, [2], 0, inventory, blank, torch)
        with self.assertRaises(ValueError):
            context_edits(frames, [3], 0, [2], 0, torch)


if __name__ == "__main__":
    unittest.main()
