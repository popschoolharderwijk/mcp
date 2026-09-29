# Finalize — language

Enforce before declaring success.

| Surface | Language |
|---------|----------|
| File names, code, tests, comments, CLI tools (I/O + code), project docs (`./docs/`, README) | **English** |
| Supabase: tables, columns, RPCs, indexes, policies, migration filenames | **English** |
| Front-end UI (labels, buttons, errors, placeholders, user-facing copy, `CHANGELOG.md`, HTML email templates for users) | **Dutch** |

In files changed during this finalize run, convert Dutch (or other non-English)
identifiers, schema names, `describe`/`it` strings, comments, and CLI strings to
English. Do not scan or edit unrelated files solely for language cleanup. Do
**not** translate front-end UI copy to English.
