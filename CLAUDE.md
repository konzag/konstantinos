# konstantinos

## What is this
A Marvel-themed quiz app built for Konstantinos (age 6, 1st grade).
Two standalone programs — no server, no deployment, no dependencies except optional colorama.

## Files
- `index.html` — Single-file browser quiz (Marvel heroes, 15 questions, Web Audio API, mobile-friendly)
- `konstantinos.py` — Terminal quiz for Windows (10 questions, colorama for colors, winsound for audio, easter egg)

## Stack
- HTML + CSS + JavaScript (vanilla, no frameworks, no build step)
- Python 3 (colorama optional, winsound built-in Windows)

## How to run
```bash
# Browser app — just double-click index.html
# Terminal app
pip install colorama   # optional
python konstantinos.py
```

## Key facts
- Target user: Konstantinos, age 6
- Language: Greek UI throughout
- No backend, no database, no deployment
- Repo: konzag/konstantinos (GitHub Pages: konzag.github.io/konstantinos)
- `.claude/` folder exists at repo root with Claude Code settings

## Notes for Claude Code
- Keep all UI text in Greek
- Marvel theme must be preserved
- Audio via Web Audio API only — no external files
- colorama import must have graceful fallback (already implemented)
