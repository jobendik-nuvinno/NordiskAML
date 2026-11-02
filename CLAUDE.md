## Project tracking (ClaudeVision contract v1)

This project's plan and progress live in `plan/` (format: `plan/README.md`). The user
follows the work in ClaudeVision, a read-only viewer; you remain in charge of how to build.

- Slice status lives only in `plan/slices/*.md` frontmatter (`planned | active | blocked |
  review | done | dropped`). Never record requirement status, counts or percentages.
- Commit subjects start with the slice ID (`S03: …`) or `plan:` for plan-only changes.
- Verify through the recorder: `plan/verify.sh --slice S03 -- <test command>`. Only runs
  that pass on a committed, clean tree count. Never edit `plan/evidence/` by hand. Before
  ending a session, run the full suite without `--slice` (`plan/verify.sh -- <tests>`).
- Done = acceptance criteria met + passing verification run; then tick the acceptance
  items, set `status: done`, add `## Outcome`, commit.
- Blocked → `status: blocked` + `blocked_by`; human-only needs → `waiting_on` in
  `plan/STATUS.md`. Lasting decisions → `plan/DECISIONS.md`.
- Update `plan/STATUS.md` (next, waiting_on, blockers, brief notes) before ending a working
  session. Fresh session: read it, the active slices and `git log --oneline -20`.
