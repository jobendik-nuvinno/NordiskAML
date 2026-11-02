# ClaudeVision project contract — version 1

This folder (`plan/`) is the project's plan and progress record. It is written by the
developer (usually Claude Code) and read — never modified — by
[ClaudeVision](https://github.com/jobendik-nuvinno/ClaudeVision).

Design rules:

- **Each fact has exactly one home.** Nothing in this folder repeats what can be derived.
- **Recorded ≠ verified.** A slice's `status` is what the developer *claims*. ClaudeVision
  separately shows what Git and verification evidence *prove*.
- **Tolerant.** Unknown fields are ignored; missing files simply turn features off.

```
plan/
  PROJECT.md          project manifest + summary            (canonical: milestones)
  requirements.json   requirement register                  (canonical: requirement definitions)
  slices/S01-x.md     one file per vertical slice           (canonical: slice scope + status)
  STATUS.md           handover note                         (canonical: next / waiting_on / blockers)
  DECISIONS.md        decision log                          (canonical: decisions)
  evidence/*.json     verification runs, machine-written    (canonical: what ran, where, result)
  verify.sh           the evidence recorder
  README.md           this document
```

Derived by ClaudeVision, **never stored**: requirement status, milestone status, counts,
percentages, "current slice", session history, staleness.

## PROJECT.md

```markdown
---
contract: claudevision/1
name: Acme Notes
milestones:
  - id: M1
    title: Core note editing
    goal: A user can create, edit and find notes offline.
  - id: M2
    title: Sync
---
One or two paragraphs: what is being built and for whom. Optional architecture overview.
```

## requirements.json

```json
{
  "schema": "claudevision.requirements/1",
  "source": "docs/SPEC.md",
  "requirements": [
    {
      "id": "R-001",
      "title": "Create a note",
      "text": "A user can create a note with a title and a Markdown body.",
      "source": "SPEC.md §2.1",
      "priority": "must",
      "acceptance": ["Saving a note with an empty title is rejected with a message"]
    }
  ]
}
```

- `id` is stable forever. Never renumber; append new requirements.
- Optional `status` is only for scope decisions that cannot be derived: `deferred` or
  `dropped` (with a reason in `note`). Do not record progress here.

## slices/S01-name.md

```markdown
---
id: S01
title: Create and list notes
milestone: M1
status: planned            # planned | active | blocked | review | done | dropped
requirements: [R-001, R-002]
depends_on: []
blocked_by: ""             # required when status is blocked
---
## Goal
What works for the user when this slice is done (end to end, demonstrable).

## Acceptance
- [ ] Creating a note shows it in the list
- [ ] `plan/verify.sh --slice S01 -- npm test` passes on a clean tree

## Notes
Design notes, discoveries, slice-local decisions.

## Outcome
(Written when done: what was delivered and which evidence run proves it.)
```

- File name: `<id>-<kebab-name>.md`. IDs: `S01`, `S02`, …; inserts use a letter suffix (`S03a`).
- A slice is *vertical*: it cuts through all layers needed to deliver working behaviour.
- `status` is the only progress field. Prefer one `active` slice per working agent.

## STATUS.md

```markdown
---
updated: 2026-10-28T21:40:00Z
next:
  - Finish S04 search ranking
waiting_on:
  - "API key for the sync provider (needed by S07)"
blockers: []
---
Short handover notes for the next session (≤ 40 lines): context that is not obvious from
the slices or Git.
```

ClaudeVision marks STATUS.md as possibly stale when code commits were made after it was last
committed.

## DECISIONS.md

```markdown
## D-001 — Use SQLite for local storage
Date: 2026-10-28 · Status: accepted · Slices: S02
Context, decision, consequences — a few lines each.
```

## evidence/*.json (written only by verify.sh)

```json
{
  "schema": "claudevision.evidence/1",
  "run_id": "20261028T214000Z-3f9c2a7-S01",
  "slice": "S01",
  "requirements": ["R-001"],
  "command": "npm test",
  "exit_code": 0,
  "result": "pass",
  "commit": "3f9c2a71d0b84e6a9c1f2e5d7b3a0c8e4f6d1a29",
  "branch": "main",
  "tree_clean": true,
  "started_at": "2026-10-28T21:40:00Z",
  "finished_at": "2026-10-28T21:40:12Z",
  "duration_s": 12,
  "output_tail": "Tests  42 passed (42)"
}
```

Usage: `plan/verify.sh [--slice S01] [--req R-001,R-002] -- <command…>`. The script exits
with the command's exit status. A run without `--slice` and `--req` is a **full-suite
regression run**. `tree_clean` is true only if the tree was clean before the command and
the command neither moved HEAD nor modified tracked files.

ClaudeVision counts a run as **verification** only if `result` is `pass`, `tree_clean` is
`true`, the commit is an ancestor of the current HEAD, and none of the slice's own files
(files touched by commits referencing the slice) changed since. When a slice's files did
change, a newer passing full-suite run on a clean, current tree re-confirms it. ClaudeVision
also checks whether each run was actually observed in a Claude Code transcript.

## Git conventions

- Commit subjects start with the slice ID (`S03: …`) or `plan:` for plan-only changes.
- Commit evidence files together with (or right after) the work they verify.
- Branches and worktrees are optional; if used, include the slice ID in the branch name.

## Optional: different location

Put `{"planDir": "docs/plan"}` in `.claudevision.json` at the repository root to keep this
folder elsewhere.
