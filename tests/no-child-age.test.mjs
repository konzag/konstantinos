// no-child-age.test.mjs: this public repo never says how old a child is or which class / school year a child is in
// (owner decision L4-29 «α», 2026-11-11). The same file is in ariana, napoleon, konstantinos and cybele.
// Scans every text file of the repo (not .git, node_modules, fonts or images). The class picker of a game may name
// all the classes («Α' Δημοτικού» … «ΣΤ' Δημοτικού»); what may not appear is an age, or a child's name next to a
// class, kindergarten or school year, or phrases like «είσαι στη <τάξη>» that state the child's own class.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SELF = relative(ROOT, fileURLToPath(import.meta.url)).split("\\").join("/");
const SKIP_DIRS = new Set([".git", "node_modules", "fonts", "test-results", "playwright-report", ".venv", "__pycache__"]);
const TEXT = new Set([".md", ".html", ".js", ".mjs", ".ts", ".py", ".json", ".txt", ".css", ".yml", ".yaml", ""]);

// The four children, plus one made-up name (Τεστοπαιδ / Testkid) that only the self-test below uses: the self-test
// never pairs a real child with an age or a class (that would be the very thing this file forbids).
const NAME = "(?:Αριάν|Ariana|Ναπολέ|Napoleon|Κωνσταντίν|Konstantinos|Κυβέλ|Κυβελίτσ|Cybele|Τεστοπαιδ|Testkid)";
const CLASS = "(?:Δημοτικ|Νηπιαγωγ|νηπιαγωγ|Προνήπι|προνήπι|kindergarten|grade|class of|σχολική χρονιά|school year)";
const RULES = [
  { why: "an age", re: /\b\d{1,2}\s*(?:χρονών|χρονώ|ετών|έτους|years?[\s-]old|-year-old)/i },
  { why: "an age", re: /\b(?:aged?|ηλικίας)\s*\d{1,2}\b/i },
  { why: "a child's name next to a class", re: new RegExp(`${NAME}[^\\n.!;]{0,60}${CLASS}`, "u") },
  { why: "a class next to a child's name", re: new RegExp(`${CLASS}[^\\n.!;]{0,40}${NAME}`, "u") },
  { why: "the child's own class", re: /(?:είσαι|πας|πάει|πηγαίνει|πηγαίνεις|is in|goes to)\s+(?:στη[νς]?\s+)?(?:[ΑΒΓΔΕ]|ΣΤ)'\s*(?:Δημοτικ|τάξη)/u },
  { why: "the child's own class", re: /(?:Εξερευνητής|Μαθητής|Μαθήτρια)\s+(?:[ΑΒΓΔΕ]|ΣΤ)'\s*Δημοτικ/u },
  { why: "a birthday", re: /γενέθλι|birthday|γεννήθηκε (?:στις|το) \d|born (?:on|in) \d/i },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (TEXT.has(extname(name).toLowerCase())) yield p;
  }
}

test("no age, birthday or child's own class in any text file of this public repo", () => {
  const hits = [];
  for (const file of files(ROOT)) {
    const rel = relative(ROOT, file).split("\\").join("/");
    if (rel === SELF || rel.endsWith("package-lock.json")) continue;
    readFileSync(file, "utf8").split(/\r?\n/).forEach((line, i) => {
      for (const r of RULES) if (r.re.test(line)) hits.push(`${rel}:${i + 1} ${r.why}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(hits, []);
});

test("the rules catch the kind of text that was removed (made-up names, ages and years only)", () => {
  const caught = (x) => RULES.some((r) => r.re.test(x));
  for (const x of [
    "Ο Τεστοπαιδάκης είναι **9 χρονών**",
    "games for Testkid (11 years old).",
    "Φέτος (2099-00) πας στη Ε' Δημοτικού ⭐",
    "Φέτος είσαι στη Γ' Δημοτικού ⭐",
    "για τον Τεστοπαιδάκη, ΣΤ' Δημοτικού!",
    "Εξερευνητής Ε' Δημοτικού. Αποστολή",
    "Επίπεδο: **Νηπιαγωγείο** (99 ετών).",
    "a 99-year-old's small hands",
    "Testkid is in Γ' Δημοτικού in 2099-00",
    "Τα γενέθλια του Testkid",
  ]) assert.ok(caught(x), x);
  for (const x of ["Παιχνίδια Δ' Δημοτικού", "Α' Τάξη: Όλα τα μαθήματα", "Γεια σου Τεστοπαιδάκη! Διάλεξε τάξη και ας παίξουμε!", "Χορεύει από τα 99 της!"]) {
    assert.ok(!caught(x), x);
  }
});
