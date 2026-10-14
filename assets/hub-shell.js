// hub-shell.js — το «κέλυφος» του hub «Τα Παιχνίδια μας» (GAME-STANDARD §9).
//
// Προσθέτει σε κάθε σελίδα δύο κουμπιά που φαίνονται πάντα (κάτω αριστερά):
//   🏠  Πίσω στα παιχνίδια: πηγαίνει στην αρχική σελίδα του hub ("/").
//   🔊  Ήχος on/off: η επιλογή θυμάται (localStorage, κλειδί game.<παιχνίδι>.sound).
//
// Πώς σβήνει ο ήχος χωρίς να αλλάξει τίποτα στο παιχνίδι:
// κάθε AudioContext που φτιάχνει η σελίδα παίρνει έναν «διακόπτη» (GainNode) ανάμεσα στους ήχους και
// στα ηχεία. Το παιχνίδι συνδέει τους ήχους του στο ctx.destination, που τώρα είναι ο διακόπτης.
// Με τον διακόπτη στο 0 οι ήχοι παίζουν κανονικά, αλλά δεν ακούγονται.
//
// Πρέπει να φορτώνεται ΠΡΙΝ από τα άλλα scripts της σελίδας, π.χ.:
//   <script src="assets/hub-shell.js" data-game="ariana"></script>
(function () {
  'use strict';

  var script = document.currentScript;
  var game = (script && script.dataset.game) || 'game';
  var KEY = 'game.' + game + '.sound';

  // Ήταν σβηστός ο ήχος την προηγούμενη φορά; (αν ο browser δεν αφήνει localStorage: ανοιχτός)
  var muted = false;
  try {
    muted = localStorage.getItem(KEY) === 'off';
  } catch (e) { /* χωρίς αποθήκευση: απλώς ξεκινάμε με ήχο */ }

  var switches = []; // ένας διακόπτης για κάθε AudioContext της σελίδας

  var Native = window.AudioContext || window.webkitAudioContext;
  if (Native) {
    var WithSwitch = function (options) {
      var ctx = options === undefined ? new Native() : new Native(options);
      var gain = ctx.createGain();
      gain.gain.value = muted ? 0 : 1;
      gain.connect(ctx.destination);
      // Από εδώ και πέρα, ό,τι συνδέει το παιχνίδι στο destination περνά από τον διακόπτη.
      Object.defineProperty(ctx, 'destination', { value: gain, configurable: true });
      switches.push(gain);
      return ctx;
    };
    WithSwitch.prototype = Native.prototype; // το «instanceof AudioContext» δουλεύει όπως πριν
    window.AudioContext = WithSwitch;
    if (window.webkitAudioContext) window.webkitAudioContext = WithSwitch;
  }

  var soundBtn = null;

  function setMuted(value) {
    muted = value;
    try {
      localStorage.setItem(KEY, muted ? 'off' : 'on');
    } catch (e) { /* δεν πειράζει: απλώς δεν θα το θυμάται */ }
    switches.forEach(function (gain) { gain.gain.value = muted ? 0 : 1; });
    if (soundBtn) {
      soundBtn.textContent = muted ? '🔇' : '🔊';
      soundBtn.setAttribute('aria-pressed', String(!muted));
    }
  }

  function makeButton(el, text, label) {
    el.textContent = text;
    el.title = label;
    el.setAttribute('aria-label', label);
    el.style.cssText =
      'width:56px;height:56px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;' +
      'font-size:28px;line-height:1;text-decoration:none;cursor:pointer;padding:0;margin:0;' +
      'background:rgba(20,20,40,.72);color:#fff;border:2px solid rgba(255,255,255,.75);' +
      'box-shadow:0 2px 8px rgba(0,0,0,.35);';
    return el;
  }

  function build() {
    if (document.getElementById('hub-shell')) return;
    var bar = document.createElement('div');
    bar.id = 'hub-shell';
    bar.style.cssText =
      'position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;gap:10px;' +
      'font-family:system-ui,sans-serif;';

    var home = makeButton(document.createElement('a'), '🏠', 'Πίσω στα παιχνίδια');
    home.href = '/';

    soundBtn = makeButton(document.createElement('button'), '🔊', 'Ήχος');
    soundBtn.type = 'button';
    soundBtn.addEventListener('click', function () { setMuted(!muted); });

    bar.appendChild(home);
    bar.appendChild(soundBtn);
    document.body.appendChild(bar);
    setMuted(muted); // σωστό εικονίδιο από την αρχή
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
