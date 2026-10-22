// quiz-logic.test.mjs — the rules of the web quiz, played in the fake browser (tests/helpers/fake-dom.mjs).
// Run: node --test tests/*.test.mjs
//
// The game has no score counter: a correct answer moves on, a wrong answer repeats the SAME question
// (CLAUDE.md: «Wrong answers repeat the question — no skipping»). So "the score" here is the question index
// `currentQ`, and the end screen is the victory sequence after the last question.
//   1. A full round asks every question exactly once and ends with the victory sequence.
//   2. Wrong answers never move on and never reach the end screen.
//   3. A second click on an answer (while the game waits) counts once.
//   4. restartQuiz() starts again from question 1 with the same set of questions, reshuffled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPage, spyOn } from './helpers/fake-dom.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function game() {
  const page = loadPage(root, 'index.html');
  const { window: w, document: d } = page;
  return {
    ...page,
    active: (id) => d.getElementById(id).classList.contains('active'),
    shown: () => d.getElementById('questionText').textContent,
    feedback: () => d.getElementById('feedbackText').textContent,
    answer: (idx) => d.getElementById('answersGrid').children[idx].click(),
    correctIdx: () => w.shuffledQuestions[w.currentQ].c,
    wrongIdx: () => w.shuffledQuestions[w.currentQ].a.findIndex((_, i) => i !== w.shuffledQuestions[w.currentQ].c),
  };
}

test('a full round asks every question exactly once and counts every correct answer', () => {
  const g = game();
  const { window: w, document: d, clock } = g;
  const total = w.questions.length;
  assert.equal(total, 15);
  d.getElementById('startQuizBtn').click();
  assert.ok(g.active('quizScreen'));

  const asked = [];
  for (let i = 0; i < total; i++) {
    assert.equal(w.currentQ, i, `${i} correct answers so far`);
    assert.equal(d.getElementById('progressLabel').textContent, `Ερώτηση ${i + 1} από ${total}`);
    asked.push(g.shown());
    // The four buttons show the four answers of the question on screen (shuffled, same set).
    const original = w.questions.find((q) => q.q === g.shown());
    const buttons = d.getElementById('answersGrid').children.map((b) => b.textContent);
    assert.deepEqual([...buttons].sort(), [...original.a].sort(), `answers of «${g.shown()}»`);
    assert.equal(buttons[g.correctIdx()], original.a[original.c], 'the marked answer is the right one');
    g.answer(g.correctIdx());
    assert.equal(g.feedback(), '✅ ΣΩΣΤΟ ΗΡΩΑ!');
    clock.advance(1000);
  }
  assert.equal(w.currentQ, total, 'all questions answered correctly');
  assert.equal(new Set(asked).size, total, 'no question twice');
  assert.deepEqual([...asked].sort(), Array.from(w.questions, (q) => q.q).sort(), 'every question asked');

  // showVictory ran at 900 ms (we are at 1000): wait screen -> +600 the Marvel victory screen.
  assert.ok(g.active('waitScreen'), 'the wait screen comes first');
  clock.advance(500);
  assert.ok(g.active('victoryScreen') && g.active('victoryMarvel'), 'victory screen');
  clock.advance(3000 + 1200 + 3000);
  assert.ok(g.active('victoryJoke'), 'the sequence ends with the joke and the replay button');
});

test('wrong answers repeat the same question and never reach the end screen', () => {
  const g = game();
  const { window: w, document: d, clock } = g;
  d.getElementById('startQuizBtn').click();
  const first = g.shown();
  const showVictory = spyOn(w, 'showVictory');

  // Every wrong answer of the first question, three times over.
  for (let round = 0; round < 3; round++) {
    for (let idx = 0; idx < w.shuffledQuestions[0].a.length; idx++) {
      if (idx === g.correctIdx()) continue;
      g.answer(idx);
      assert.equal(g.feedback(), '❌ Όχι! Δοκίμασε ξανά!');
      clock.advance(1000);
      assert.equal(w.currentQ, 0, 'still on the first question');
      assert.equal(g.shown(), first, 'the same question again');
      assert.equal(g.feedback(), '', 'feedback cleared for the next try');
    }
  }
  // Then one wrong answer on every other question too (after moving on with a correct one).
  for (let i = 0; i < w.questions.length - 1; i++) {
    g.answer(g.correctIdx());
    clock.advance(1000);
    const q = g.shown();
    g.answer(g.wrongIdx());
    clock.advance(1000);
    assert.equal(w.currentQ, i + 1, 'a wrong answer does not move on');
    assert.equal(g.shown(), q);
  }
  clock.advance(60_000);
  assert.ok(g.active('quizScreen'), 'still in the quiz');
  assert.ok(!g.active('waitScreen') && !g.active('victoryScreen'), 'no end screen');
  assert.deepEqual(showVictory, [], 'no victory');
});

test('a second click on an answer counts once', () => {
  const g = game();
  const { window: w, document: d, clock } = g;
  d.getElementById('startQuizBtn').click();
  const correct = spyOn(w, 'playCorrect');
  const wrong = spyOn(w, 'playWrong');

  // Correct, then a second (and third) tap before the next question shows.
  const c = g.correctIdx();
  g.answer(c);
  g.answer(c);
  w.handleAnswer(c);
  g.answer(g.wrongIdx()); // a wrong tap while waiting does not count either
  assert.equal(w.currentQ, 1, 'moved on by one question only');
  assert.equal(correct.length, 1, 'one «correct» sound');
  assert.equal(wrong.length, 0, 'no «wrong» sound');
  assert.equal(g.feedback(), '✅ ΣΩΣΤΟ ΗΡΩΑ!', 'one feedback message');
  clock.advance(1000);
  assert.equal(w.currentQ, 1);

  // Wrong, then a second tap (even on the right answer) before the question comes back.
  const w1 = g.wrongIdx();
  g.answer(w1);
  g.answer(g.correctIdx());
  assert.equal(w.currentQ, 1, 'the tap during the «try again» pause is ignored');
  assert.equal(wrong.length, 1);
  assert.equal(correct.length, 1);
  assert.equal(g.feedback(), '❌ Όχι! Δοκίμασε ξανά!');
  clock.advance(1000);

  // The last question: double tap -> the victory starts once.
  const showVictory = spyOn(w, 'showVictory');
  while (w.currentQ < w.questions.length - 1) {
    g.answer(g.correctIdx());
    clock.advance(1000);
  }
  const last = g.correctIdx();
  g.answer(last);
  g.answer(last);
  clock.advance(1000);
  assert.equal(w.currentQ, w.questions.length);
  assert.equal(showVictory.length, 1, 'victory once');
});

test('restartQuiz resets the question index and reshuffles the same set', () => {
  const g = game();
  const { window: w, document: d, clock } = g;
  d.getElementById('startQuizBtn').click();
  const before = w.shuffledQuestions;
  for (let i = 0; i < 5; i++) {
    g.answer(g.correctIdx());
    clock.advance(1000);
  }
  assert.equal(w.currentQ, 5);
  d.body.classList.add('joke-mode');
  d.getElementById('victoryJoke').classList.add('active');

  w.restartQuiz();
  assert.equal(w.currentQ, 0, 'back to question 1');
  assert.ok(w.shuffledQuestions !== before, 'a new shuffle');
  assert.equal(d.getElementById('progressLabel').textContent, `Ερώτηση 1 από ${w.questions.length}`);
  assert.equal(g.shown(), w.shuffledQuestions[0].q);
  assert.ok(g.active('quizScreen'), 'quiz screen');
  assert.ok(!g.active('victoryJoke') && !d.body.classList.contains('joke-mode'), 'victory cleared');

  // Array.from: the page's arrays live in another realm (node:vm), deepEqual wants plain host arrays.
  const texts = (list) => Array.from(list, (q) => q.q).sort();
  assert.deepEqual(texts(w.shuffledQuestions), texts(before), 'same set of questions');
  assert.deepEqual(texts(w.shuffledQuestions), texts(w.questions));
  for (const q of w.shuffledQuestions) {
    const original = w.questions.find((o) => o.q === q.q);
    assert.deepEqual([...q.a].sort(), [...original.a].sort(), `same answers: ${q.q}`);
    assert.equal(q.a[q.c], original.a[original.c], `right answer kept: ${q.q}`);
  }

  // Over several restarts the order changes (15! orders: the same order twice in a row is ~0).
  const orders = new Set();
  for (let i = 0; i < 5; i++) {
    w.restartQuiz();
    orders.add(w.shuffledQuestions.map((q) => q.q).join('|'));
  }
  assert.ok(orders.size > 1, 'the order is shuffled');
});
