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


if __name__ == "__main__":
    unittest.main()
