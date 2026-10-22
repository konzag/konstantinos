# -*- coding: utf-8 -*-
"""
Μικροί έλεγχοι για το παιχνίδι (μόνο με την τυπική βιβλιοθήκη της Python).

Τρέξιμο:  python -m unittest discover -s tests -v

Τι ελέγχουμε:
  1. Κάθε ερώτηση έχει σωστή απάντηση που υπάρχει πραγματικά στη λίστα.
  2. Οι ερωτήσεις του index.html και του konstantinos.py είναι ίδιες.
  3. Οι διορθώσεις προσβασιμότητας (a11y) στο index.html δεν χάθηκαν.
"""

import json
import os
import re
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import konstantinos  # noqa: E402  (χωρίς colorama δουλεύει κανονικά)

with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
    HTML = f.read()


def html_questions():
    """Βγάζει τον πίνακα `questions` από τη JavaScript του index.html."""
    m = re.search(r"var questions = (\[.*?\n\]);", HTML, re.S)
    assert m, "δεν βρέθηκε ο πίνακας questions στο index.html"
    # {q:"..", a:[..], c:2}  ->  {"q":"..", "a":[..], "c":2}  (έγκυρο JSON)
    js = re.sub(r"([{,])\s*(q|a|c):", r'\1"\2":', m.group(1))
    return json.loads(js)


class QuestionsTest(unittest.TestCase):
    def check(self, questions):
        self.assertEqual(len(questions), 15)
        for q in questions:
            # Η σωστή απάντηση πρέπει να είναι μέσα στη λίστα...
            self.assertTrue(0 <= q["c"] < len(q["a"]), q["q"])
            # ...και οι απαντήσεις μοναδικές, αλλιώς το ανακάτεμα
            # (indexOf / index) θα έβρισκε λάθος θέση.
            self.assertEqual(len(set(q["a"])), len(q["a"]), q["q"])

    def test_python_questions(self):
        self.check(konstantinos.QUESTIONS)

    def test_html_questions(self):
        self.check(html_questions())

    def test_same_questions_in_both_games(self):
        self.assertEqual(html_questions(), konstantinos.QUESTIONS)

    def test_math_answers(self):
        # Οι λογαριασμοί πρέπει να είναι σωστοί!
        by_q = {q["q"]: q["a"][q["c"]] for q in html_questions()}
        self.assertEqual(by_q["Πόσο κάνει 5 + 3;"], str(5 + 3))
        self.assertEqual(by_q["34 + 75 = ;"], str(34 + 75))
        self.assertEqual(by_q["17 × 2 = ;"], str(17 * 2))


class AccessibilityTest(unittest.TestCase):
    def test_language_is_greek(self):
        self.assertIn('<html lang="el">', HTML)

    def test_feedback_is_announced(self):
        self.assertRegex(HTML, r'id="feedbackText"[^>]*aria-live=')

    def test_focus_moves_to_new_question(self):
        self.assertIn('id="questionText" tabindex="-1"', HTML)
        self.assertIn("getElementById('questionText').focus()", HTML)

    def test_visible_keyboard_focus(self):
        self.assertIn(".btn-answer:focus-visible", HTML)

    def test_reduced_motion(self):
        self.assertIn("@media (prefers-reduced-motion: reduce)", HTML)

    def test_low_contrast_colours_not_back(self):
        # Αυτά τα χρώματα είχαν αντίθεση κάτω από 4.5:1 (WCAG AA).
        # (assertFalse ώστε σε αποτυχία να μη τυπωθεί όλο το HTML)
        self.assertFalse(re.search(r"\.feedback-text\.wrong\s*\{\s*color:\s*#ff7070", HTML))
        self.assertFalse("#27ae60)" in HTML)  # λευκά γράμματα σε #27ae60
        self.assertFalse("135deg,#27ae60" in HTML)


class TerminalRoundTest(unittest.TestCase):
    """Ένας ολόκληρος γύρος του konstantinos.py με «ψεύτικο» πληκτρολόγιο.

    Το παιχνίδι δεν κρατά σκορ: η σωστή απάντηση πάει στην επόμενη ερώτηση,
    η λάθος ξαναρωτά την ίδια (CLAUDE.md). Χωρίς ανακάτεμα (shuffle = τίποτα),
    χωρίς αναμονή (sleep) και χωρίς ήχο, ώστε το τεστ να τρέχει αμέσως.
    """

    def play(self, answers, func="run_quiz"):
        import builtins
        import io
        from contextlib import redirect_stdout
        from unittest import mock

        typed = iter(answers)

        def fake_input(prompt=""):
            try:
                return next(typed)
            except StopIteration:
                raise EOFError  # τέλος της «πληκτρολόγησης»

        out = io.StringIO()
        with mock.patch.object(builtins, "input", fake_input), \
                mock.patch.object(konstantinos.random, "shuffle", lambda a: None), \
                mock.patch.object(konstantinos.time, "sleep", lambda s: None), \
                mock.patch.object(konstantinos, "beep", lambda f, ms: None), \
                redirect_stdout(out):
            getattr(konstantinos, func)()
        self.assertEqual(list(typed), [], "όλες οι απαντήσεις διαβάστηκαν")
        return out.getvalue()

    @staticmethod
    def correct(q):
        return str(q["c"] + 1)  # χωρίς ανακάτεμα, η σωστή είναι στη θέση c (1-4 στην οθόνη)

    @staticmethod
    def wrong(q):
        return "1" if q["c"] != 0 else "2"

    def test_terminal_round_with_fake_input(self):
        qs = konstantinos.QUESTIONS
        out = self.play([self.correct(q) for q in qs])
        total = len(qs)
        self.assertEqual(out.count("✅ ΣΩΣΤΟ ΗΡΩΑ!"), total, "μία φορά «σωστό» για κάθε ερώτηση")
        self.assertNotIn("ΛΑΘΟΣ", out)
        self.assertIn(f"Ερώτηση {total} από {total}  [{'█' * 20}] 100%", out)
        for i, q in enumerate(qs, 1):
            self.assertEqual(out.count(f"❓ {q['q']}"), 1, f"ερώτηση {i} μία φορά")
            self.assertIn(f"Ερώτηση {i} από {total}", out)

    def test_one_wrong_answer_repeats_that_question_only(self):
        qs = konstantinos.QUESTIONS
        typed = [self.correct(q) for q in qs]
        typed.insert(4, self.wrong(qs[4]))  # λάθος στην 5η ερώτηση, μετά η σωστή
        out = self.play(typed)
        self.assertEqual(out.count("❌ ΛΑΘΟΣ! Δοκίμασε ξανά!"), 1)
        self.assertEqual(out.count("✅ ΣΩΣΤΟ ΗΡΩΑ!"), len(qs), "το λάθος δεν μετράει, ούτε προσπερνά")
        self.assertEqual(out.count(f"❓ {qs[4]['q']}"), 2, "η ίδια ερώτηση ξανά")
        self.assertEqual(out.count(f"❓ {qs[5]['q']}"), 1)
        self.assertIn("100%", out)

    def test_typing_mistakes_are_not_answers(self):
        qs = konstantinos.QUESTIONS
        typed = ["", "abc", "0", "5", "-1"] + [self.correct(q) for q in qs]
        out = self.play(typed)
        self.assertEqual(out.count("⚠️  Γράψε έναν αριθμό από 1 έως 4!"), 5)
        self.assertNotIn("ΛΑΘΟΣ", out)
        self.assertEqual(out.count(f"❓ {qs[0]['q']}"), 6, "η πρώτη ερώτηση ξανά μετά από κάθε λάθος πλήκτρο")

    def test_closed_input_stops_without_endless_loop(self):
        with self.assertRaises(SystemExit) as stop:
            self.play([self.correct(konstantinos.QUESTIONS[0])])
        self.assertEqual(stop.exception.code, 0)

    def test_whole_game_from_welcome_to_victory(self):
        qs = konstantinos.QUESTIONS
        out = self.play([""] + [self.correct(q) for q in qs] + [""], func="main")
        self.assertIn("Καλώς ήρθες, Κωνσταντίνε!", out)
        self.assertNotIn("ΒΑΖΕΛΟΣ", out, "το μυστικό αστείο μόνο με «vazelos»")
        self.assertIn("ΕΙΣΑΙ ΑΛΗΘΙΝΟΣ ΗΡΩΑΣ ΤΗΣ MARVEL!", out)
        self.assertIn("ΕΙΣΑΙ Ο ΜΕΓΑΛΥΤΕΡΟΣ ΟΠΑΔΟΣ ΤΟΥ ΟΛΥΜΠΙΑΚΟΥ!", out)
        self.assertLess(out.index("100%"), out.index("ΑΛΗΘΙΝΟΣ ΗΡΩΑΣ"), "η νίκη μετά την τελευταία ερώτηση")


if __name__ == "__main__":
    unittest.main()
