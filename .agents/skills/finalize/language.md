# Finalize — language

Enforce before declaring success.

| Surface | Language |
|---------|----------|
| File names, Code, tests, comments, CLI tools (I/O + code) | **English** |
| Front-end UI (labels, buttons, errors, placeholders, user-facing copy) | **Dutch** |
| Docs under `./docs/` | Dutch (only touch if your fix edits them) |

In files changed during this finalize run, convert Dutch (or other non-English)
identifiers, `describe`/`it` strings, comments, and CLI strings to English. Do not
scan or edit unrelated files solely for language cleanup. Do **not** translate
front-end UI copy to English.
