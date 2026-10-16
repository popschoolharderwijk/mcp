#!/usr/bin/env bash
# Start the Cursor agent as a dedicated Linux user with workspace ACLs.
#
# Usage (normal):  ./run-agent/run-agent.sh [agent-args...]
# Every run rebuilds managed ACLs from .cursorignore, then starts the agent.
# Optional:        ./run-agent/run-agent.sh --acl-only   # refresh ACLs, do not start
#
# Control plane (read-only for the agent): this directory (run-agent/) and
# .cursorignore — otherwise the agent could rewrite the launcher or ignore
# policy and weaken denies.
#
# Residual risks (not a full sandbox):
# - Host ACL rebuild is not an isolation boundary. Prefer a container/VM FS
#   for a real security boundary; this script is defense-in-depth for local use.
# - ACL updates are not atomic: a crash mid-apply can leave a partial tree.
#   The launcher stops AGENT_USER processes first and verifies denies before
#   starting the agent; that reduces races but does not make updates atomic.
# - safe_path_under_workspace is TOCTOU-prone if the tree is rewritten between
#   deny-list generation and setfacl (e.g. dir replaced by symlink).
# - Symlink targets keep their own permissions; denying a symlink does not
#   isolate the target.
# - POSIX ACL masks may be recalculated by setfacl; inspect with getfacl if
#   other named ACL entries exist on the tree.
# - Default ACLs are applied only to directories (never setfacl -R -d on a
#   mixed tree); access ACL ops fail the script on non-zero exit.
# - .cursorignore is approximated via git check-ignore; Cursor-only semantics
#   and negation/directory combinations are not fully faithfully enforced.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(cd -P "$SCRIPT_DIR/.." && pwd)"
RUN_AGENT_DIR="$SCRIPT_DIR"
CURSORIGNORE_PATH="$WORKSPACE/.cursorignore"
# shellcheck source=lib/cursorignore-deny-paths.sh
source "$SCRIPT_DIR/lib/cursorignore-deny-paths.sh"

DEFAULT_USER="agent-$(basename "$WORKSPACE" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-' | cut -c1-24)"
AGENT_USER="${AGENT_USER:-$DEFAULT_USER}"

validate_agent_user() {
	local name="$1"
	if [[ ! "$name" =~ ^[a-z_][a-z0-9_-]*$ ]]; then
		echo "error: AGENT_USER must match ^[a-z_][a-z0-9_-]*$ (got: $name)" >&2
		exit 1
	fi
	if [[ ${#name} -gt 32 ]]; then
		echo "error: AGENT_USER max length is 32 (got ${#name})" >&2
		exit 1
	fi
}

ACL_ONLY=0
AGENT_ARGS=()
for arg in "$@"; do
	case "$arg" in
		--acl-only) ACL_ONLY=1 ;;
		*) AGENT_ARGS+=("$arg") ;;
	esac
done

validate_agent_user "$AGENT_USER"

ensure_user() {
	if id "$AGENT_USER" &>/dev/null; then
		return
	fi
	echo "Creating user: $AGENT_USER"
	sudo useradd --create-home --shell /bin/bash "$AGENT_USER"
}

# No AGENT_USER processes may run while ACLs are rebuilt.
ensure_agent_idle_for_acl_update() {
	if ! id "$AGENT_USER" &>/dev/null; then
		return 0
	fi
	if ! pgrep -u "$AGENT_USER" >/dev/null 2>&1; then
		return 0
	fi

	echo "Stopping processes for $AGENT_USER before ACL update"
	sudo pkill -u "$AGENT_USER" 2>/dev/null || true
	local i
	for i in 1 2 3 4 5; do
		if ! pgrep -u "$AGENT_USER" >/dev/null 2>&1; then
			return 0
		fi
		sleep 0.2
	done
	sudo pkill -9 -u "$AGENT_USER" 2>/dev/null || true
	sleep 0.2
	if pgrep -u "$AGENT_USER" >/dev/null 2>&1; then
		echo "error: could not stop all processes for $AGENT_USER; refusing ACL update" >&2
		exit 1
	fi
}

require_setfacl() {
	if ! command -v setfacl &>/dev/null; then
		echo "error: setfacl required (install package 'acl')" >&2
		exit 1
	fi
}

# Fail the script if setfacl returns non-zero (needed under set -e with helpers).
setfacl_or_die() {
	if ! sudo setfacl "$@"; then
		echo "error: setfacl $* failed" >&2
		exit 1
	fi
}

# Missing ACL entries are fine when clearing a previous run.
setfacl_best_effort() {
	sudo setfacl "$@" 2>/dev/null || true
}

# Default ACLs are directory-only; never use setfacl -R -d on a mixed tree.
foreach_workspace_dir() {
	local root="$1"
	local dir
	while IFS= read -r -d '' dir; do
		"${@:2}" "$dir"
	done < <(find -P "$root" -type d -print0)
}

# Drop only this agent's named ACL entries (access + default), then re-apply.
# Does not wipe unrelated users' ACL entries.
clear_agent_acl_entries() {
	local root="$1"
	setfacl_best_effort -R -P -x "u:${AGENT_USER}" "$root"
	foreach_workspace_dir "$root" setfacl_best_effort -d -x "u:${AGENT_USER}"
}

grant_workspace_access() {
	require_setfacl
	clear_agent_acl_entries "$WORKSPACE"

	# Access ACL on files + dirs. -P: do not follow symlinks into targets.
	setfacl_or_die -R -P -m "u:${AGENT_USER}:rwX" "$WORKSPACE"
	# Default ACL only on directories (new children inherit agent access).
	foreach_workspace_dir "$WORKSPACE" setfacl_or_die -d -m "u:${AGENT_USER}:rwX"

	local dir="$WORKSPACE"
	while [[ "$dir" != "/" ]]; do
		dir="$(dirname "$dir")"
		setfacl_best_effort -x "u:${AGENT_USER}" "$dir"
		setfacl_best_effort -m "u:${AGENT_USER}:x" "$dir"
	done
}

# Re-validate path at apply time (narrows TOCTOU; does not eliminate it).
revalidate_deny_path() {
	local kind="$1"
	local path="$2"
	local rel checked

	if [[ "$path" != "$WORKSPACE"/* ]]; then
		echo "error: deny path outside workspace: $path" >&2
		exit 1
	fi
	rel="${path#"$WORKSPACE"/}"
	if ! checked="$(safe_path_under_workspace "$WORKSPACE" "$rel")"; then
		echo "error: deny path failed revalidation (escape or symlink): $path" >&2
		exit 1
	fi
	if [[ "$checked" != "$path" ]]; then
		echo "error: deny path changed under revalidation: $path -> $checked" >&2
		exit 1
	fi
	if [[ "$kind" == "dir" ]]; then
		if [[ ! -d "$path" || -L "$path" ]]; then
			echo "error: deny dir missing or is symlink at apply time: $path" >&2
			exit 1
		fi
	elif [[ "$kind" == "file" ]]; then
		if [[ ! -f "$path" || -L "$path" ]]; then
			echo "error: deny file missing or is symlink at apply time: $path" >&2
			exit 1
		fi
	else
		echo "error: invalid deny kind: $kind" >&2
		exit 1
	fi
}

acl_deny_agent_path() {
	local kind="$1"
	local path="$2"

	revalidate_deny_path "$kind" "$path"
	if [[ "$kind" == "dir" ]]; then
		setfacl_or_die -m "u:${AGENT_USER}:---" "$path"
		setfacl_or_die -d -m "u:${AGENT_USER}:---" "$path"
	else
		setfacl_or_die -m "u:${AGENT_USER}:---" "$path"
	fi
}

acl_readonly_agent_file() {
	setfacl_or_die -m "u:${AGENT_USER}:r--" "$1"
}

acl_readonly_agent_dir() {
	# Traverse/list only; no create/delete/rename. Default ACL keeps new children RO.
	setfacl_or_die -m "u:${AGENT_USER}:r-X" "$1"
	setfacl_or_die -d -m "u:${AGENT_USER}:r-X" "$1"
}

# Launcher + ignore policy must stay immutable for the agent.
lock_control_plane_readonly() {
	local path

	if [[ ! -d "$RUN_AGENT_DIR" || -L "$RUN_AGENT_DIR" ]]; then
		echo "error: run-agent control dir missing or is symlink: $RUN_AGENT_DIR" >&2
		exit 1
	fi

	while IFS= read -r -d '' path; do
		if [[ -L "$path" ]]; then
			echo "error: refusing symlink in control plane: $path" >&2
			exit 1
		fi
		if [[ -d "$path" ]]; then
			acl_readonly_agent_dir "$path"
		elif [[ -f "$path" ]]; then
			acl_readonly_agent_file "$path"
		fi
	done < <(find -P "$RUN_AGENT_DIR" -print0)

	if [[ -e "$CURSORIGNORE_PATH" ]]; then
		if [[ -L "$CURSORIGNORE_PATH" || ! -f "$CURSORIGNORE_PATH" ]]; then
			echo "error: .cursorignore must be a regular file: $CURSORIGNORE_PATH" >&2
			exit 1
		fi
		acl_readonly_agent_file "$CURSORIGNORE_PATH"
	fi

	echo "Locked control plane read-only for $AGENT_USER (run-agent/ + .cursorignore)"
}

verify_control_plane_readonly() {
	local path

	assert_agent_cannot_write_path "$RUN_AGENT_DIR" "run-agent/"
	while IFS= read -r -d '' path; do
		[[ -f "$path" || -d "$path" ]] || continue
		assert_agent_cannot_write_path "$path" "control plane path"
		if [[ -f "$path" ]] && ! sudo -u "$AGENT_USER" test -r "$path" 2>/dev/null; then
			echo "error: agent cannot read control plane file: $path" >&2
			exit 1
		fi
	done < <(find -P "$RUN_AGENT_DIR" -print0)

	if [[ -f "$CURSORIGNORE_PATH" ]]; then
		assert_agent_cannot_write_path "$CURSORIGNORE_PATH" ".cursorignore"
		if ! sudo -u "$AGENT_USER" test -r "$CURSORIGNORE_PATH" 2>/dev/null; then
			echo "error: agent cannot read .cursorignore" >&2
			exit 1
		fi
	fi
}

# Generate the full deny list before any ACL mutation. Fail closed.
write_deny_list_file() {
	local out="$1"

	if [[ ! -f "$CURSORIGNORE_PATH" ]]; then
		: >"$out"
		echo "No .cursorignore — empty ACL deny list"
		return 0
	fi

	if ! collect_cursorignore_deny_entries "$WORKSPACE" >"$out"; then
		echo "error: failed to resolve .cursorignore; refusing ACL update / agent start" >&2
		return 1
	fi
	if ! sort -u "$out" -o "$out"; then
		echo "error: failed to sort deny list" >&2
		return 1
	fi
}

apply_deny_list_file() {
	local list="$1"
	local kind path
	local count=0

	while IFS=$'\t' read -r kind path || [[ -n "${kind:-}" ]]; do
		[[ -z "${kind:-}" && -z "${path:-}" ]] && continue
		[[ -z "${kind:-}" || -z "${path:-}" ]] && continue
		acl_deny_agent_path "$kind" "$path"
		count=$((count + 1))
	done <"$list"

	echo "Denied $AGENT_USER on $count .cursorignore target(s) (dirs use default ACL for new files)"
}

verify_deny_list_file() {
	local list="$1"
	local kind path

	while IFS=$'\t' read -r kind path || [[ -n "${kind:-}" ]]; do
		[[ -z "${kind:-}" || -z "${path:-}" ]] && continue
		revalidate_deny_path "$kind" "$path"
		if [[ "$kind" == "dir" ]]; then
			if sudo -u "$AGENT_USER" test -x "$path" 2>/dev/null \
				|| sudo -u "$AGENT_USER" test -r "$path" 2>/dev/null; then
				echo "error: deny verification failed (dir still accessible): $path" >&2
				exit 1
			fi
		else
			if sudo -u "$AGENT_USER" test -r "$path" 2>/dev/null \
				|| sudo -u "$AGENT_USER" test -w "$path" 2>/dev/null; then
				echo "error: deny verification failed (file still accessible): $path" >&2
				exit 1
			fi
		fi
	done <"$list"
}

# Rebuild managed ACLs from current .cursorignore every start.
apply_workspace_acls() {
	local deny_list

	ensure_agent_idle_for_acl_update
	echo "Refreshing ACLs for $AGENT_USER (workspace=$WORKSPACE)"

	deny_list="$(mktemp)"
	# shellcheck disable=SC2064
	trap "rm -f '$deny_list'" RETURN

	# Fail before mutating ACLs if the deny list cannot be resolved.
	if ! write_deny_list_file "$deny_list"; then
		return 1
	fi

	grant_workspace_access
	apply_deny_list_file "$deny_list"
	lock_control_plane_readonly
	verify_deny_list_file "$deny_list"
	verify_control_plane_readonly
}

assert_agent_cannot_write_path() {
	local path="$1"
	local label="$2"
	if sudo -u "$AGENT_USER" test -w "$path" 2>/dev/null; then
		echo "error: $label is writable by $AGENT_USER: $path" >&2
		exit 1
	fi
}

assert_agent_binary_safe() {
	local bin="$1"
	local dir

	assert_agent_cannot_write_path "$bin" "agent binary"
	dir="$(dirname "$bin")"
	while [[ "$dir" != "/" ]]; do
		assert_agent_cannot_write_path "$dir" "agent binary parent"
		dir="$(dirname "$dir")"
	done
}

ensure_user
if ! apply_workspace_acls; then
	exit 1
fi

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
assert_agent_binary_safe "$AGENT_BIN"

echo "Starting agent as $AGENT_USER in $WORKSPACE"
echo "First time: ./run-agent/run-agent.sh login"
exec sudo -u "$AGENT_USER" -H -- "$AGENT_BIN" --workspace "$WORKSPACE" --sandbox enabled "${AGENT_ARGS[@]}"
