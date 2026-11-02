#!/bin/sh
# ClaudeVision evidence recorder (contract v1).
#
#   plan/verify.sh [--slice S03] [--req R-001,R-002] -- <command> [args...]
#
# Runs the command, shows its output, and writes a small JSON record to
# plan/evidence/ describing what ran, against which commit, whether the
# working tree was clean, and the exit status. Exits with the command's status.
# Needs only POSIX sh, git, awk and date.

set -u

usage() {
  echo "usage: $0 [--slice ID] [--req ID[,ID...]] -- <command> [args...]" >&2
  exit 64
}

slice=""
reqs=""
while [ $# -gt 0 ]; do
  case "$1" in
    --slice) [ $# -ge 2 ] || usage; slice="$2"; shift 2 ;;
    --req|--reqs|--requirements) [ $# -ge 2 ] || usage; reqs="$2"; shift 2 ;;
    --) shift; break ;;
    -h|--help) usage ;;
    -*) echo "verify: unknown option $1" >&2; usage ;;
    *) break ;;
  esac
done
[ $# -gt 0 ] || usage

here=$(cd "$(dirname "$0")" && pwd)
root=$(git -C "$here" rev-parse --show-toplevel 2>/dev/null) || { echo "verify: not inside a git repository" >&2; exit 65; }
# Path of this folder relative to the repository root (robust to symlinks and letter case).
prefix=$(git -C "$here" rev-parse --show-prefix 2>/dev/null) || exit 65
evdir="$here/evidence"
rel_ev="${prefix}evidence"
mkdir -p "$evdir" || exit 73

commit=$(git -C "$root" rev-parse --verify -q HEAD 2>/dev/null || true)
branch=$(git -C "$root" symbolic-ref --short -q HEAD 2>/dev/null || echo "")
# A failing `git status` must never be mistaken for a clean tree.
if status_out=$(git -C "$root" status --porcelain --untracked-files=normal -- . ":(exclude)$rel_ev" 2>/dev/null); then
  if [ -z "$status_out" ]; then clean=true; else clean=false; fi
else
  clean=false
fi

started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
t0=$(date +%s)
out=$(mktemp "${TMPDIR:-/tmp}/cv-verify-out.XXXXXX") || exit 73
codef=$(mktemp "${TMPDIR:-/tmp}/cv-verify-code.XXXXXX") || exit 73
trap 'rm -f "$out" "$codef"' EXIT INT TERM

# Run the command, streaming its output while keeping a copy.
{ "$@" 2>&1; echo $? >"$codef"; } | tee "$out"
code=$(cat "$codef" 2>/dev/null)
[ -n "$code" ] || code=1

finished=$(date -u +%Y-%m-%dT%H:%M:%SZ)
t1=$(date +%s)

# The run only counts for the recorded commit if the command did not move HEAD or
# change tracked files while it ran.
commit_after=$(git -C "$root" rev-parse --verify -q HEAD 2>/dev/null || true)
if [ "$clean" = true ]; then
  if [ "$commit_after" != "$commit" ]; then
    clean=false
  elif ! tracked_after=$(git -C "$root" status --porcelain --untracked-files=no -- . ":(exclude)$rel_ev" 2>/dev/null) || [ -n "$tracked_after" ]; then
    clean=false
  fi
fi
if [ "$code" -eq 0 ]; then result=pass; else result=fail; fi

# JSON string escaping (reads stdin, writes an escaped string without quotes).
json_escape() {
  awk 'BEGIN { ORS = "" }
  {
    gsub(/\\/, "\\\\"); gsub(/"/, "\\\""); gsub(/\t/, "\\t"); gsub(/\r/, "")
    gsub(/\033\[[0-9;?]*[A-Za-z]/, "")
    gsub(/[\001-\010\013\014\016-\037\177]/, "")
    if (NR > 1) printf "\\n"
    printf "%s", $0
  }'
}

cmd_str=""
for a in "$@"; do
  case "$a" in
    *[[:space:]]*|"") cmd_str="$cmd_str '$a'" ;;
    *) cmd_str="$cmd_str $a" ;;
  esac
done
cmd_str=${cmd_str# }

req_json=""
if [ -n "$reqs" ]; then
  old_ifs=$IFS
  IFS=', '
  for r in $reqs; do
    [ -n "$r" ] || continue
    r_esc=$(printf '%s' "$r" | json_escape)
    req_json="$req_json${req_json:+, }\"$r_esc\""
  done
  IFS=$old_ifs
fi

short=$(printf '%s' "${commit:-nocommit}" | cut -c1-7)
safe_slice=$(printf '%s' "${slice:-run}" | tr -c 'A-Za-z0-9_-' '_')
run_id="$stamp-$short-$safe_slice"
file="$evdir/$run_id.json"
n=1
while [ -e "$file" ]; do
  n=$((n + 1))
  file="$evdir/$run_id-$n.json"
done
run_id=$(basename "$file" .json)

commit_json=null
[ -n "$commit" ] && commit_json="\"$commit\""

{
  printf '{\n'
  printf '  "schema": "claudevision.evidence/1",\n'
  printf '  "run_id": "%s",\n' "$run_id"
  printf '  "slice": "%s",\n' "$(printf '%s' "$slice" | json_escape)"
  printf '  "requirements": [%s],\n' "$req_json"
  printf '  "command": "%s",\n' "$(printf '%s' "$cmd_str" | json_escape)"
  printf '  "exit_code": %s,\n' "$code"
  printf '  "result": "%s",\n' "$result"
  printf '  "commit": %s,\n' "$commit_json"
  printf '  "branch": "%s",\n' "$(printf '%s' "$branch" | json_escape)"
  printf '  "tree_clean": %s,\n' "$clean"
  printf '  "started_at": "%s",\n' "$started"
  printf '  "finished_at": "%s",\n' "$finished"
  printf '  "duration_s": %s,\n' "$((t1 - t0))"
  printf '  "output_tail": "%s"\n' "$(tail -n 60 "$out" | json_escape)"
  printf '}\n'
} >"$file"

label=$(printf '%s' "$result" | tr 'a-z' 'A-Z')
note=""
[ "$clean" = true ] || note=" (working tree was not clean before/after the run: not counted as verification)"
[ -n "$commit" ] || note=" (no commit yet: not counted as verification)"
echo "verify: $label (exit $code)${slice:+ $slice} @ ${short} -> $rel_ev/$(basename "$file")$note" >&2
exit "$code"
