#!/usr/bin/env bash
# Build Quick BI skills into distributable zip archives.
#
# Usage:
#   scripts/build.sh <skill-name>          Build one skill
#   scripts/build.sh all                   Build every skill under skills/
#
# Options:
#   --tag <skill-name>@<version>   Fail unless the skill matches this release tag
#   --out <dir>                    Output directory (default: <repo>/dist)
#
# Output: <out>/<skill-name>-<version>.zip. The zip contains the skill folder
# itself (SKILL.md at <skill-name>/SKILL.md), so unzipping into an agent's
# skill directory installs the skill. __pycache__, .DS_Store and .git entries
# are excluded.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
OUT_DIR="$REPO_ROOT/dist"
EXPECTED_TAG=""
SKILLS=()

die() {
  echo "error: $*" >&2
  exit 1
}

usage() {
  sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --tag)
      [ $# -ge 2 ] || die "--tag needs a value"
      EXPECTED_TAG="$2"
      shift 2
      ;;
    --out)
      [ $# -ge 2 ] || die "--out needs a value"
      OUT_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage 0
      ;;
    all)
      SKILLS+=("__all__")
      shift
      ;;
    -*)
      die "unknown option: $1 (try --help)"
      ;;
    *)
      SKILLS+=("$1")
      shift
      ;;
  esac
done

[ ${#SKILLS[@]} -gt 0 ] || usage 1

# Read a top-level key from SKILL.md frontmatter (first --- ... --- block).
frontmatter_value() {
  awk -v key="$2" '
    NR == 1 && /^---[ \t]*$/ { fm = 1; next }
    fm && /^---[ \t]*$/ { exit }
    fm && $0 ~ "^" key ":[ \t]*" {
      sub("^" key ":[ \t]*", "")
      gsub(/\r$/, "")
      print
      exit
    }
  ' "$1"
}

package_dir() {
  # $1 = skill dir name (relative to SKILLS_DIR), $2 = output zip path
  local name="$1" out="$2"
  rm -f "$out"
  if command -v zip >/dev/null 2>&1; then
    (cd "$SKILLS_DIR" && zip -r -q "$out" "$name" -x "*__pycache__*" -x "*.DS_Store*" -x "*/.git/*")
  else
    command -v python3 >/dev/null 2>&1 || die "neither 'zip' nor 'python3' is available"
    (cd "$SKILLS_DIR" && python3 - "$name" "$out" <<'PY'
import os
import sys
import zipfile

name, out = sys.argv[1], sys.argv[2]
skip_dirs = {"__pycache__", ".git"}
skip_files = {".DS_Store"}

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(name):
        dirs[:] = sorted(d for d in dirs if d not in skip_dirs)
        for fname in sorted(files):
            if fname in skip_files:
                continue
            path = os.path.join(root, fname)
            zf.write(path, path)
PY
    )
  fi
}

build_skill() {
  local name="$1"
  local dir="$SKILLS_DIR/$name"

  [ -d "$dir" ] || die "skill not found: skills/$name"
  [ -f "$dir/SKILL.md" ] || die "skills/$name/SKILL.md is missing"

  local fm_name fm_version
  fm_name="$(frontmatter_value "$dir/SKILL.md" name)"
  fm_version="$(frontmatter_value "$dir/SKILL.md" version)"

  [ -n "$fm_name" ] || die "skills/$name/SKILL.md: missing 'name' in frontmatter"
  [ -n "$fm_version" ] || die "skills/$name/SKILL.md: missing 'version' in frontmatter"
  [ "$fm_name" = "$name" ] || die "skills/$name/SKILL.md: frontmatter name '$fm_name' does not match folder name"
  printf '%s\n' "$fm_version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$' \
    || die "skills/$name/SKILL.md: version '$fm_version' is not semantic"

  if [ -n "$EXPECTED_TAG" ]; then
    [ "$EXPECTED_TAG" = "$name@$fm_version" ] \
      || die "tag '$EXPECTED_TAG' does not match skills/$name at version $fm_version"
  fi

  mkdir -p "$OUT_DIR"
  local out="$OUT_DIR/$name-$fm_version.zip"
  package_dir "$name" "$out"
  echo "built: $out ($(du -h "$out" | cut -f1))"
}

if [ ${#SKILLS[@]} -eq 1 ] && [ "${SKILLS[0]}" = "__all__" ]; then
  [ -z "$EXPECTED_TAG" ] || die "--tag can only be combined with a single skill name, not 'all'"
  found=0
  for dir in "$SKILLS_DIR"/*/; do
    [ -d "$dir" ] || continue
    [ -f "$dir/SKILL.md" ] || continue
    build_skill "$(basename "$dir")"
    found=1
  done
  [ "$found" -eq 1 ] || die "no skills found under skills/"
else
  [ -z "$EXPECTED_TAG" ] || [ ${#SKILLS[@]} -eq 1 ] \
    || die "--tag can only be combined with a single skill name"
  for name in "${SKILLS[@]}"; do
    build_skill "$name"
  done
fi
