# -*- coding: utf-8 -*-
"""
⚡ Η Αποστολή του Κωνσταντίνου — Marvel Quiz (Terminal Edition) ⚡
Για τον Κωνσταντίνο, Α' Δημοτικού
"""

import sys
import time

# ── COLORAMA (graceful fallback) ──────────────────────────────────────────────
try:
    from colorama import init, Fore, Back, Style
    init(autoreset=True)
    HAS_COLOR = True
except ImportError:
    HAS_COLOR = False
    class _Stub:
        def __getattr__(self, _): return ''
    Fore = Back = Style = _Stub()

# ── WINSOUND (Windows built-in) ───────────────────────────────────────────────
try:
    import winsound
    HAS_SOUND = True
except ImportError:
    HAS_SOUND = False

def beep(freq, ms):
    if HAS_SOUND:
        try:
            winsound.Beep(freq, ms)
        except Exception:
            pass

def happy_beep():
    beep(523, 120)
    beep(659, 120)
    beep(784, 200)

def sad_beep():
    beep(400, 150)
    beep(300, 250)

def fanfare():
    for f, d in [(523,150),(587,150),(659,150),(784,300),(659,100),(784,500)]:
        beep(f, d)

def olymp_melody():
    for f, d in [(784,120),(880,120),(988,120),(1047,250),
                 (880,100),(988,120),(1047,350),(1175,500)]:
        beep(f, d)


# ── WELCOME ART ───────────────────────────────────────────────────────────────
LIGHTNING = r"""
    ██╗     ██╗ ██████╗ ██╗  ██╗████████╗███╗   ██╗██╗███╗   ██╗ ██████╗
    ██║     ██║██╔════╝ ██║  ██║╚══██╔══╝████╗  ██║██║████╗  ██║██╔════╝
    ██║     ██║██║  ███╗███████║   ██║   ██╔██╗ ██║██║██╔██╗ ██║██║  ███╗
    ██║     ██║██║   ██║██╔══██║   ██║   ██║╚██╗██║██║██║╚██╗██║██║   ██║
    ███████╗██║╚██████╔╝██║  ██║   ██║   ██║ ╚████║██║██║ ╚████║╚██████╔╝
    ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝ ╚═════╝

              ⚡  Η  Α Π Ο Σ Τ Ο Λ Η  Τ Ο Υ  Κ Ω Ν Σ Τ Α Ν Τ Ι Ν Ο Υ  ⚡
"""

TROPHY_ART = r"""
         ___________
        '._==_==_=_.'
        .-\:      /-.
       | (|:.     |) |
        '-|:.     |-'
          \::.    /
           '::. .'
             ) (
           _.' '._
          `'''''''`
"""


# ── QUESTIONS ─────────────────────────────────────────────────────────────────
QUESTIONS = [
    {
        "q": "Πόσο κάνει 5 + 3;",
        "a": ["6", "7", "8", "9"],
        "c": 2,
    },
    {
        "q": "Αν βάλεις πολύ αλάτι στο φαγητό, γίνεται...",
        "a": ["Γλυκό", "Αλμυρό", "Πικρό", "Ξινό"],
        "c": 1,
    },
    {
        "q": "Ποιος ήρωας της Marvel φοράει κόκκινη και χρυσή στολή;",
        "a": ["Spider-Man", "Thor", "Iron Man", "Hulk"],
        "c": 2,
    },
    {
        "q": "34 + 75 = ;",
        "a": ["99", "109", "108", "100"],
        "c": 1,
    },
    {
        "q": "Τι συμβαίνει αν αφήσεις παγωτό στον ήλιο;",
        "a": ["Παγώνει", "Λιώνει", "Μεγαλώνει", "Πετάει"],
        "c": 1,
    },
    {
        "q": "Ο Hulk, όταν θυμώνει, τι χρώμα γίνεται;",
        "a": ["Κόκκινος", "Μπλε", "Πράσινος", "Κίτρινος"],
        "c": 2,
    },
    {
        "q": "Έχεις 20 ευρώ και αγοράζεις κάτι που κοστίζει 13 ευρώ. Πόσα σου μένουν;",
        "a": ["5", "6", "7", "8"],
        "c": 2,
    },
    {
        "q": "Ο Spider-Man από πού πήρε τις δυνάμεις του;",
        "a": [
            "Από έναν κεραυνό",
            "Τον δάγκωσε μια ραδιενεργός αράχνη",
            "Έπιε ένα μαγικό φίλτρο",
            "Τον χτύπησε μετεωρίτης",
        ],
        "c": 1,
    },
    {
        "q": "Αν μια γάτα έχει 4 πόδια, πόσα πόδια έχουν 3 γάτες;",
        "a": ["8", "10", "12", "16"],
        "c": 2,
    },
    {
        "q": "Τι είναι το πιο σκληρό πράγμα στον κόσμο;",
        "a": ["Σίδηρος", "Χρυσός", "Διαμάντι", "Βράχος"],
        "c": 2,
    },
]

HERO_ICONS = ["🕷️ ", "🤖 ", "💚 ", "⚡ ", "🛡️ "]


# ── HELPERS ───────────────────────────────────────────────────────────────────
def clear_section():
    print("\n" + "═" * 60)

def print_red(text):
    print(Fore.RED + Style.BRIGHT + text)

def print_yellow(text):
    print(Fore.YELLOW + Style.BRIGHT + text)

def print_green(text):
    print(Fore.GREEN + Style.BRIGHT + text)

def print_cyan(text):
    print(Fore.CYAN + Style.BRIGHT + text)

def print_white(text):
    print(Fore.WHITE + Style.BRIGHT + text)


# ── WELCOME ───────────────────────────────────────────────────────────────────
def welcome():
    print_red(LIGHTNING)
    print_yellow("  Καλώς ήρθες, Κωνσταντίνε!")
    print_white("  Είσαι έτοιμος για την ΑΠΟΣΤΟΛΗ ΤΗΣ MARVEL;")
    print()
    print_cyan("  [Πάτα ENTER για να ξεκινήσεις την αποστολή...]")
    print_cyan("   > "),
    sys.stdout.flush()

    user_input = input().strip()

    # ── SECRET EASTER EGG ──
    if user_input.lower() == "vazelos":
        time.sleep(1)
        print()
        print(Fore.GREEN + Style.BRIGHT + "  😂 ΠΛΑΚΑ ΚΑΝΩ ΚΩΝΣΤΑΝΤΙΝΕ!")
        time.sleep(0.5)
        print(Fore.GREEN + Style.BRIGHT + "  ΕΙΣΑΙ Ο ΠΙΟ ΜΕΓΑΛΟΣ ΒΑΖΕΛΟΣ!")
        time.sleep(0.5)
        print(Fore.GREEN + Style.BRIGHT + "  Ο ΠΙΟ ΤΡΑΝΟΣ ΦΙΛΑΘΛΟΣ ΤΟΥ ΠΑΝΑΘΗΝΑΙΚΟΥ! 🟢")
        time.sleep(3)
        print()
        print_yellow("  ... και τώρα ας αρχίσει η ΑΛΗΘΙΝΗ αποστολή! ⚡")
        time.sleep(1)


# ── QUIZ ──────────────────────────────────────────────────────────────────────
def run_quiz():
    total = len(QUESTIONS)
    for i, qdata in enumerate(QUESTIONS):
        clear_section()
        hero = HERO_ICONS[(i // 2) % len(HERO_ICONS)]

        # Progress bar
        filled = int((i / total) * 20)
        bar = "█" * filled + "░" * (20 - filled)
        print_yellow(f"  {hero} Ερώτηση {i+1} από {total}  [{bar}]")
        print()

        while True:
            # Print question
            print_white(f"  ❓ {qdata['q']}")
            print()
            for j, ans in enumerate(qdata["a"], 1):
                print(Fore.CYAN + f"     {j}. {ans}")
            print()
            print(Fore.WHITE + "  Απάντησέ μου (1-4): ", end="")
            sys.stdout.flush()

            try:
                raw = input().strip()
                choice = int(raw) - 1
            except (ValueError, EOFError):
                print_red("  ⚠️  Γράψε έναν αριθμό από 1 έως 4!")
                print()
                continue

            if choice < 0 or choice > 3:
                print_red("  ⚠️  Γράψε έναν αριθμό από 1 έως 4!")
                print()
                continue

            if choice == qdata["c"]:
                print()
                print_green("  ✅ ΣΩΣΤΟ ΗΡΩΑ! 🎉")
                happy_beep()
                time.sleep(0.6)
                break
            else:
                print()
                print_red("  ❌ ΛΑΘΟΣ! Δοκίμασε ξανά!")
                sad_beep()
                time.sleep(0.5)
                print()

    # Final progress bar (100%)
    clear_section()
    print_yellow("  ⚡ Ερώτηση 10 από 10  [████████████████████] 100%")
    print()


# ── VICTORY ───────────────────────────────────────────────────────────────────
def victory():
    clear_section()
    print()
    fanfare()

    print_yellow(TROPHY_ART)
    time.sleep(0.5)

    print_yellow("  ⚡ ΑΠΙΣΤΕΥΤΟ! ΕΙΣΑΙ ΑΛΗΘΙΝΟΣ ΗΡΩΑΣ ΤΗΣ MARVEL! ⚡")
    print()
    time.sleep(2)

    print_red("  🔴⚪ ΑΛΛΑ ΠΕΡΙΜΕΝΕ... ⚪🔴")
    time.sleep(2)

    clear_section()
    olymp_melody()
    print()

    red = Fore.RED + Style.BRIGHT
    white = Fore.WHITE + Style.BRIGHT

    print(red  + "  " + "🏆" * 10)
    print()
    print(white + "  🏆 ΕΙΣΑΙ Ο ΜΕΓΑΛΥΤΕΡΟΣ ΟΠΑΔΟΣ ΤΟΥ ΟΛΥΜΠΙΑΚΟΥ! 🏆")
    print()
    print(red   + "  Ο ΠΙΟ ΓΑΥΡΟΣ ΑΠΟ ΟΛΟΥΣ! 🔴⚪🔴")
    print()
    print(red  + "  " + "🔴⚪" * 15)
    print()
    time.sleep(3)


# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    welcome()
    run_quiz()
    victory()
    print_cyan("\n  Πάτα ENTER για έξοδο...")
    try:
        input()
    except (EOFError, KeyboardInterrupt):
        pass


if __name__ == "__main__":
    main()
