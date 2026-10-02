# Runner colors release — 2026-10-02

Approved scope: randomized per-room color order, distinct participants by persistent join slot, stable after rank changes/reload/removal. Realtime subscription/polling logic unchanged.

- Existing random public room UUID seeds a deterministic 42-color shuffle. Existing DB joined_order determines the slot; no schema migration.
- Include joinedOrder in HTTP progress and host.progress broadcast. Browser uses roomId + joinedOrder rather than participant ID hash or rank.
- Removed participants retain their slots; replacement joins beyond42 use a disjoint dark RGB permutation (131072 overflow slots). Color uniqueness is finite; repetition is possible only after that many replacement joins within one room.
- RED: new color tests fail on previous hash allocation; real PG state lacks joinedOrder. GREEN: allocation, UI rendering, PG snapshot/broadcast tests pass.
- Independent reviewer identified HSL rounding collisions in overflow. Replaced with explicit RGB allocation; revised tests verify10000 unique hex colors. Final review has no actionable findings.
- Full suite:87 files,460 tests pass including load/bundle checks; typecheck/build/diffcheck pass.
- Local Playwright with authorized localhost-only synthetic class: actual computed RGB42/42 distinct; score reorder, reload, removal retain colors;1366/1024/390px widths no horizontal overflow; no console errors.
- Public deployment and browser checks are recorded below after publication. Physical iPad touch/classroom concurrency are outside this verification.
