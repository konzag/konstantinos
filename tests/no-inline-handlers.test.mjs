// no-inline-handlers.test.mjs — CSP guard + the buttons still work + the victory sequence.
// Run: node --test tests/*.test.mjs
//   1. No served file has an inline event handler (onclick="…" etc.): the games hub can drop 'unsafe-hashes'.
//   2. The start / replay buttons still call startQuiz() / restartQuiz().
//   3. A full play-through (15 correct answers) ends with: Olympiakos for exactly 3 seconds, THEN the
//      Panathinaikos joke — and it is the same EVERY time (we play three rounds via the replay button).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPage, spyOn, servedFiles, findInlineHandlers } from './helpers/fake-dom.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('no inline event-handler attributes in served files', () => {
  assert.ok(servedFiles(root).includes('index.html'));
  assert.deepEqual(findInlineHandlers(root), []);
});

test('start and replay buttons call the game functions', () => {
  const page = loadPage(root, 'index.html');
  const start = spyOn(page.window, 'startQuiz');
  const restart = spyOn(page.window, 'restartQuiz');
  page.document.getElementById('startQuizBtn').click();
  assert.deepEqual(start, [[]]);
  page.document.getElementById('restartQuizBtn').click();
  assert.deepEqual(restart, [[]]);
});

test('victory: Olympiakos for 3 s, then the Panathinaikos joke, every time', () => {
  const { window: w, document: d, clock } = loadPage(root, 'index.html');
  const active = (id) => d.getElementById(id).classList.contains('active');

  const playAllCorrect = () => {
    for (let i = 0; i < w.shuffledQuestions.length; i++) {
      assert.ok(active('quizScreen'), `question ${i + 1} is on screen`);
      const correct = w.shuffledQuestions[w.currentQ].c;
      d.getElementById('answersGrid').children[correct].click();
      clock.advance(1000); // next question / victory starts after 800-900 ms
    }
  };

  for (let round = 1; round <= 3; round++) {
    d.getElementById(round === 1 ? 'startQuizBtn' : 'restartQuizBtn').click();
    assert.ok(!d.body.classList.contains('joke-mode'), `round ${round}: joke mode cleared on replay`);
    assert.ok(!active('victoryJoke') && !active('victoryOlymp'), `round ${round}: victory phases reset`);
    playAllCorrect();
    // showVictory started at -100 ms: +600 Marvel, +3000 "wait...", +1200 Olympiakos, +3000 joke.
    clock.advance(600 + 3000 + 1200 - 100);
    assert.ok(active('victoryOlymp'), `round ${round}: Olympiakos is shown`);
    assert.ok(!active('victoryJoke'), `round ${round}: no joke yet`);
    clock.advance(2999);
    assert.ok(active('victoryOlymp') && !active('victoryJoke'), `round ${round}: Olympiakos stays for 3 s`);
    clock.advance(1);
    assert.ok(active('victoryJoke'), `round ${round}: then the Panathinaikos joke`);
    assert.ok(!active('victoryOlymp'), `round ${round}: Olympiakos is gone`);
    assert.ok(d.body.classList.contains('joke-mode'), `round ${round}: green joke mode`);
    clock.advance(10000);
    assert.ok(active('victoryJoke'), `round ${round}: the joke stays until replay`);
  }
});
