import importlib.util
from pathlib import Path
import sys
import unittest

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
spec = importlib.util.spec_from_file_location("mandarin_human", TOOLS / "audit-mandarin-human.py")
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
from mandarin_prompt_lexicon import EXPANDED_PROMPTS, segments


class MandarinPromptTest(unittest.TestCase):
    def test_one_explicit_segment_per_character(self):
        for text, tokens in audit.PROMPTS.items():
            segments = [p.split("/") for p in tokens.split()]
            self.assertEqual(len(text), len(segments))
            self.assertTrue(all(len(pair) == 2 and all(pair) for pair in segments))

    def test_surface_segment_conventions(self):
        self.assertEqual(audit.PROMPTS["我家有四口人"].split(),
            ["ZERO/uo", "j/ia", "ZERO/iou", "s/ii", "k/ou", "r/en"])
        self.assertIn("x/ve", audit.PROMPTS["他的同學都叫他胖子"])
        self.assertIn("sh/iii", audit.PROMPTS["我哥哥是大學生學中文"])
        self.assertIn("ZERO/v", audit.PROMPTS["我母親是中學英語老師"])

    def test_expanded_preserves_original_reviewed_prompts(self):
        self.assertEqual(len(EXPANDED_PROMPTS), 50)
        for text, value in audit.PROMPTS.items():
            self.assertEqual(EXPANDED_PROMPTS[text], value)
        for text, value in EXPANDED_PROMPTS.items():
            self.assertEqual(len(text), len(value.split()))

    def test_context_readings_and_model_spelling(self):
        self.assertIn("d/ai f/u", EXPANDED_PROMPTS["我父親是一個有名的大夫"])
        self.assertIn("d/ei", EXPANDED_PROMPTS["先得把屋子打掃得乾乾淨淨"])
        self.assertIn("l/v x/ing", EXPANDED_PROMPTS["也有人利用這個假期去旅行"])
        for p, expected in {"xu":"x/v", "xue":"x/ve", "xun":"x/vn", "yuan":"ZERO/van",
                "zhi":"zh/iii", "zi":"z/ii", "ji":"j/i", "gui":"g/uei", "lun":"l/uen"}.items():
            self.assertEqual(segments(p), expected)
        with self.assertRaises(ValueError):
            segments("unknown")


if __name__ == "__main__":
    unittest.main()
