// hub-shell.js — το «κέλυφος» του hub «Τα Παιχνίδια μας» (GAME-STANDARD §9).
//
// Προσθέτει σε κάθε σελίδα τρία κουμπιά που φαίνονται πάντα (κάτω αριστερά):
//   🏠  Πίσω στα παιχνίδια: πηγαίνει στην αρχική σελίδα του hub ("/").
//   🔊  Ήχος on/off: η επιλογή θυμάται (localStorage, κλειδί game.<παιχνίδι>.sound).
//   EN  Γλώσσα του κελύφους: ελληνικά ή αγγλικά (localStorage, κλειδί games.lang, κοινό για όλα τα παιχνίδια).
//       Αλλάζει μόνο τα κείμενα των κουμπιών· το ίδιο το παιχνίδι μένει όπως το έγραψαν τα παιδιά.
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
  var LANG_KEY = 'games.lang'; // ίδιο κλειδί σε όλα τα παιχνίδια του hub: η γλώσσα ακολουθεί το παιδί

  // Τα κείμενα του κελύφους στις δύο γλώσσες. «lang» = το κουμπί που αλλάζει γλώσσα:
  // δείχνει την ΑΛΛΗ γλώσσα (αυτή που θα διαλέξεις αν το πατήσεις).
  var STRINGS = {
    el: { home: 'Πίσω στα παιχνίδια', sound: 'Ήχος', langText: 'EN', langLabel: 'EN · English' },
    en: { home: 'Back to games', sound: 'Sound', langText: 'ΕΛ', langLabel: 'ΕΛ · Ελληνικά' }
  };

  // Ήταν σβηστός ο ήχος την προηγούμενη φορά; (αν ο browser δεν αφήνει localStorage: ανοιχτός)
  var muted = false;
  try {
    muted = localStorage.getItem(KEY) === 'off';
  } catch (e) { /* χωρίς αποθήκευση: απλώς ξεκινάμε με ήχο */ }

  // Ποια γλώσσα είχε διαλέξει; Ό,τι άλλο (τίποτα, λάθος τιμή, χωρίς localStorage) = ελληνικά.
  var lang = 'el';
  try {
    if (localStorage.getItem(LANG_KEY) === 'en') lang = 'en';
  } catch (e) { /* χωρίς αποθήκευση: ελληνικά */ }

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

  var bar = null;
  var home = null;
  var soundBtn = null;
  var langBtn = null;

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

  // Γράφει μια ετικέτα σε κουμπί: ως title (φαίνεται με το ποντίκι) και aria-label (το διαβάζει ο αναγνώστης οθόνης).
  function label(el, text) {
    el.title = text;
    el.setAttribute('aria-label', text);
  }

  // Βάζει τα κείμενα της γλώσσας στα κουμπιά. Με save=true τη θυμάται κιόλας.
  function setLang(value, save) {
    lang = value === 'en' ? 'en' : 'el';
    if (save) {
      try {
        localStorage.setItem(LANG_KEY, lang);
      } catch (e) { /* δεν πειράζει: απλώς δεν θα το θυμάται */ }
    }
    var s = STRINGS[lang];
    if (bar) bar.setAttribute('lang', lang); // μόνο τα κουμπιά αλλάζουν γλώσσα, όχι η σελίδα
    if (home) label(home, s.home);
    if (soundBtn) label(soundBtn, s.sound);
    if (langBtn) {
      langBtn.textContent = s.langText;
      label(langBtn, s.langLabel);
    }
  }

  function makeButton(el, text) {
    el.textContent = text;
    el.style.cssText =
      'width:56px;height:56px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;' +
      'font-size:28px;line-height:1;text-decoration:none;cursor:pointer;padding:0;margin:0;' +
      'background:rgba(20,20,40,.72);color:#fff;border:2px solid rgba(255,255,255,.75);' +
      'box-shadow:0 2px 8px rgba(0,0,0,.35);';
    return el;
  }

  function build() {
    if (document.getElementById('hub-shell')) return;
    bar = document.createElement('div');
    bar.id = 'hub-shell';
    bar.style.cssText =
      'position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;gap:10px;' +
      'font-family:system-ui,sans-serif;';

    home = makeButton(document.createElement('a'), '🏠');
    home.href = '/';

    soundBtn = makeButton(document.createElement('button'), '🔊');
    soundBtn.type = 'button';
    soundBtn.addEventListener('click', function () { setMuted(!muted); });

    langBtn = makeButton(document.createElement('button'), 'EN');
    langBtn.type = 'button';
    langBtn.style.fontSize = '20px';
    langBtn.style.fontWeight = '700';
    langBtn.addEventListener('click', function () { setLang(lang === 'el' ? 'en' : 'el', true); });

    bar.appendChild(home);
    bar.appendChild(soundBtn);
    bar.appendChild(langBtn);
    document.body.appendChild(bar);
    setMuted(muted); // σωστό εικονίδιο από την αρχή
    setLang(lang, false); // σωστά κείμενα από την αρχή
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
