#!/usr/bin/env bash
set -euo pipefail

# Workspace = repository root (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(cd "$SCRIPT_DIR/.." && pwd)"

# Fixed or derived username (max ~32 chars, [a-z0-9_-])
DEFAULT_USER="agent-$(basename "$WORKSPACE" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-' | cut -c1-24)"
AGENT_USER="${AGENT_USER:-$DEFAULT_USER}"

ACL_ONLY=0
AGENT_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --acl-only) ACL_ONLY=1 ;;
    *) AGENT_ARGS+=("$arg") ;;
  esac
done

ensure_user() {
  if id "$AGENT_USER" &>/dev/null; then
    return
  fi
  echo "Creating user: $AGENT_USER"
  sudo useradd --create-home --shell /bin/bash "$AGENT_USER"
}

grant_workspace_access() {
  if ! command -v setfacl &>/dev/null; then
    echo "error: setfacl required (install package 'acl')" >&2
    exit 1
  fi
  # Agent user r/w; you keep ownership. -P: do not follow symlinks into targets.
  sudo setfacl -R -P -m "u:${AGENT_USER}:rwX" "$WORKSPACE"
  sudo setfacl -R -P -d -m "u:${AGENT_USER}:rwX" "$WORKSPACE"

  # Parent dirs: traverse only, otherwise that user cannot reach the path
  local dir="$WORKSPACE"
  while [[ "$dir" != "/" ]]; do
    dir="$(dirname "$dir")"
    sudo setfacl -m "u:${AGENT_USER}:x" "$dir" 2>/dev/null || true
  done
}

# Deny targets from .cursorignore:
# - Patterns like import/source/* → the directory itself (default ACL covers new files)
# - File patterns like **/.env → matching files that are not under a denied directory
# Never enumerate children of denied dirs; no x on the dir already blocks access.
collect_cursorignore_deny_paths() {
  local ignore_file="$WORKSPACE/.cursorignore"
  if [[ ! -f "$ignore_file" ]]; then
    return 0
  fi
  if ! command -v git &>/dev/null; then
    echo "error: git required to resolve .cursorignore paths" >&2
    exit 1
  fi

  local tmp line anchor rel abs parent denied skip
  local -a denied_dirs=()
  tmp="$(mktemp -d)"
  git init -q "$tmp"
  cp "$ignore_file" "$tmp/.gitignore"

  # Directory anchors from non-glob prefixes of /* and /** patterns
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line//[[:space:]]/}" ]]; then
      continue
    fi
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    if [[ "$line" == !* ]]; then
      continue
    fi
    if [[ "$line" =~ ^([^*?!\[]+)/(\*\*|\*)$ ]]; then
      anchor="${BASH_REMATCH[1]}"
      abs="$WORKSPACE/$anchor"
      if [[ -d "$abs" && ! -L "$abs" ]]; then
        denied_dirs+=("$abs")
        printf '%s\n' "$abs"
      fi
    fi
  done <"$ignore_file"

  # File matches only — skip anything already covered by a denied directory
  while IFS= read -r rel; do
    [[ -z "$rel" ]] && continue
    abs="$WORKSPACE/$rel"
    case "$abs" in
      "$WORKSPACE"/*) ;;
      *) continue ;;
    esac
    skip=0
    for denied in "${denied_dirs[@]}"; do
      case "$abs" in
        "$denied"|"$denied"/*) skip=1; break ;;
      esac
    done
    if [[ "$skip" -eq 1 ]]; then
      continue
    fi
    if [[ -L "$abs" ]]; then
      parent="$(dirname "$abs")"
      skip=0
      for denied in "${denied_dirs[@]}"; do
        case "$parent" in
          "$denied"|"$denied"/*) skip=1; break ;;
        esac
      done
      if [[ "$skip" -eq 0 && "$parent" != "$WORKSPACE" && -d "$parent" && ! -L "$parent" ]]; then
        printf '%s\n' "$parent"
      fi
      continue
    fi
    if [[ -f "$abs" ]]; then
      printf '%s\n' "$abs"
    fi
  done < <(
    find -P "$WORKSPACE" \( -type f -o -type l \) ! -path "$WORKSPACE" -printf '%P\n' \
      | git -C "$tmp" check-ignore --no-index --stdin || true
  )

  rm -rf "$tmp"
}

# Directory: access + default ACL (new children inherit deny). Files: access ACL only.
acl_deny_agent_path() {
  local path="$1"
  if [[ -L "$path" ]]; then
    return 0
  fi
  if [[ -d "$path" ]]; then
    sudo setfacl -m "u:${AGENT_USER}:---" "$path"
    sudo setfacl -d -m "u:${AGENT_USER}:---" "$path"
  elif [[ -f "$path" ]]; then
    sudo setfacl -m "u:${AGENT_USER}:---" "$path"
  fi
}

deny_cursorignore_paths() {
  local ignore_file="$WORKSPACE/.cursorignore"
  if [[ ! -f "$ignore_file" ]]; then
    echo "No .cursorignore — skip ACL deny list"
    return 0
  fi

  local -a paths=()
  local path
  local count=0

  mapfile -t paths < <(collect_cursorignore_deny_paths | sort -u)
  for path in "${paths[@]}"; do
    [[ -z "$path" ]] && continue
    acl_deny_agent_path "$path"
    count=$((count + 1))
  done

  echo "Denied $AGENT_USER on $count .cursorignore target(s) (dirs use default ACL for new files)"
}

ensure_user
grant_workspace_access
deny_cursorignore_paths

if [[ "$ACL_ONLY" -eq 1 ]]; then
  echo "ACL update complete for $AGENT_USER (workspace=$WORKSPACE)"
  exit 0
fi

AGENT_BIN="$(command -v agent || true)"
if [[ -z "$AGENT_BIN" ]]; then
  echo "error: 'agent' not found on PATH for $(whoami)" >&2
  exit 1
fi
AGENT_BIN="$(readlink -f "$AGENT_BIN")"

echo "Starting agent as $AGENT_USER in $WORKSPACE"
echo "First time: ./scripts/run-agent.sh login"
exec sudo -u "$AGENT_USER" -H -- "$AGENT_BIN" --workspace "$WORKSPACE" --sandbox enabled "${AGENT_ARGS[@]}"
