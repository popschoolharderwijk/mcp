#!/usr/bin/env bash
# Resolve .cursorignore targets that should get agent deny ACLs.
# Prints "dir<TAB>abs" or "file<TAB>abs" (symlinks skipped).
#
# Approximation only: patterns are evaluated with git check-ignore after
# copying .cursorignore to a temp .gitignore. That is not a full Cursor
# ignore implementation. Directory denies + negation demotion are ACL
# workarounds, not identical to ignore semantics.
#
# Paths are lexically resolved under the canonical workspace; .. escapes and
# symlink path components are rejected. Check-to-use races remain if the
# tree changes between collection and setfacl (see run-agent.sh).
set -euo pipefail

normalize_ignore_rel() {
	local rel="${1#./}"
	rel="${rel#/}"
	printf '%s' "$rel"
}

# Static prefix of a pattern for demotion checks (before first unescaped glob).
ignore_pattern_static_prefix() {
	local pat="$1"
	pat="${pat#./}"
	pat="${pat#/}"
	if [[ "$pat" =~ ^([^*?[]+) ]]; then
		local prefix="${BASH_REMATCH[1]}"
		prefix="${prefix%/}"
		printf '%s' "$prefix"
		return 0
	fi
	printf ''
}

# Directory anchors: secrets/ → secrets; import/source/* → import/source
directory_anchor_from_ignore_line() {
	local line="$1"
	local pat anchor

	if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line//[[:space:]]/}" ]]; then
		return 1
	fi
	line="${line#"${line%%[![:space:]]*}"}"
	line="${line%"${line##*[![:space:]]}"}"
	if [[ "$line" == !* ]]; then
		return 1
	fi

	pat="$line"
	if [[ "$pat" =~ /$ ]]; then
		anchor="$(normalize_ignore_rel "${pat%/}")"
		[[ -n "$anchor" ]] || return 1
		printf '%s' "$anchor"
		return 0
	fi
	if [[ "$pat" =~ ^([^*?!\[]+)/(\*\*|\*)(/\*\*)?$ ]]; then
		anchor="$(normalize_ignore_rel "${BASH_REMATCH[1]}")"
		[[ -n "$anchor" ]] || return 1
		printf '%s' "$anchor"
		return 0
	fi
	return 1
}

path_is_under_or_equal() {
	local path="$1"
	local root="$2"
	[[ "$path" == "$root" || "$path" == "$root"/* ]]
}

# Lexically join workspace + rel without following symlinks. Rejects escape via
# .., absolute rel, workspace root itself, and any symlink component on the path.
# On success prints the absolute path under workspace.
safe_path_under_workspace() {
	local workspace="$1"
	local rel="$2"
	local segment rest resolved
	local -a stack=()

	[[ -n "$rel" ]] || return 1
	if [[ "$rel" == /* ]]; then
		return 1
	fi

	rest="$rel"
	while [[ -n "$rest" ]]; do
		segment="${rest%%/*}"
		if [[ "$rest" == */* ]]; then
			rest="${rest#*/}"
		else
			rest=""
		fi
		case "$segment" in
			'' | '.') continue ;;
			'..')
				if [[ ${#stack[@]} -eq 0 ]]; then
					return 1
				fi
				unset 'stack[-1]'
				;;
			*) stack+=("$segment") ;;
		esac
	done

	if [[ ${#stack[@]} -eq 0 ]]; then
		return 1
	fi

	resolved="$workspace"
	for segment in "${stack[@]}"; do
		resolved="$resolved/$segment"
		if [[ -L "$resolved" ]]; then
			return 1
		fi
	done

	if ! path_is_under_or_equal "$resolved" "$workspace" || [[ "$resolved" == "$workspace" ]]; then
		return 1
	fi

	printf '%s' "$resolved"
}

canonical_workspace_root() {
	local raw="$1"
	local resolved
	resolved="$(cd -P "$raw" && pwd)" || return 1
	printf '%s' "$resolved"
}

# Negation under a dir means ACL cannot honor !file if the dir itself is ---.
dir_should_demote_for_negations() {
	local dir_rel="$1"
	shift
	local neg prefix
	for neg in "$@"; do
		[[ -z "$neg" ]] && continue
		prefix="$(ignore_pattern_static_prefix "$neg")"
		if [[ -z "$prefix" ]]; then
			# Wildcard-only negation (e.g. !**/x): demote to keep file-level check-ignore.
			return 0
		fi
		if path_is_under_or_equal "$prefix" "$dir_rel" || path_is_under_or_equal "$dir_rel" "$prefix"; then
			return 0
		fi
	done
	return 1
}

# Reads paths on stdin. Prints git exit status: 0 match, 1 none, other error.
git_check_ignore_status() {
	local repo="$1"
	local status
	set +e
	git -C "$repo" check-ignore --no-index --stdin >/dev/null 2>"$repo/check-ignore.err"
	status=$?
	set -e
	printf '%s' "$status"
}

# Return 0 ignored, 1 not ignored, 2 hard error.
rel_is_ignored_dir() {
	local repo="$1"
	local rel="$2"
	local status

	status="$(printf '%s/\n' "$rel" | git_check_ignore_status "$repo")"
	if [[ "$status" == "0" ]]; then
		return 0
	fi
	if [[ "$status" != "1" ]]; then
		echo "error: git check-ignore failed for directory: $rel" >&2
		if [[ -s "$repo/check-ignore.err" ]]; then
			cat "$repo/check-ignore.err" >&2
		fi
		return 2
	fi

	status="$(printf '%s\n' "$rel" | git_check_ignore_status "$repo")"
	if [[ "$status" == "0" ]]; then
		return 0
	fi
	if [[ "$status" == "1" ]]; then
		return 1
	fi
	echo "error: git check-ignore failed for directory: $rel" >&2
	if [[ -s "$repo/check-ignore.err" ]]; then
		cat "$repo/check-ignore.err" >&2
	fi
	return 2
}

# Write ignored relative paths from a path list to stdout. Fails on git errors.
git_check_ignore_list() {
	local repo="$1"
	local path_list="$2"
	local status out err

	err="$repo/check-ignore-list.err"
	set +e
	out="$(git -C "$repo" check-ignore --no-index --stdin <"$path_list" 2>"$err")"
	status=$?
	set -e
	case "$status" in
		0)
			printf '%s\n' "$out"
			return 0
			;;
		1)
			return 0
			;;
		*)
			echo "error: git check-ignore failed while resolving .cursorignore" >&2
			if [[ -s "$err" ]]; then
				cat "$err" >&2
			fi
			return 1
			;;
	esac
}

find_paths_or_die() {
	local out="$1"
	local err="$2"
	shift 2
	local status

	set +e
	find "$@" >"$out" 2>"$err"
	status=$?
	set -e
	if [[ "$status" -ne 0 ]]; then
		echo "error: find failed while resolving .cursorignore (incomplete tree scan)" >&2
		if [[ -s "$err" ]]; then
			cat "$err" >&2
		fi
		return 1
	fi
}

collect_cursorignore_deny_entries() {
	local workspace
	workspace="$(canonical_workspace_root "$1")" || {
		echo "error: cannot resolve workspace root: $1" >&2
		return 1
	}
	local ignore_file="$workspace/.cursorignore"

	if [[ ! -f "$ignore_file" ]]; then
		return 0
	fi
	if ! command -v git &>/dev/null; then
		echo "error: git required to resolve .cursorignore paths" >&2
		return 1
	fi

	local tmp line anchor abs rel skip status
	local -a denied_dir_rels=()
	local -a negation_pats=()
	local -a denied_dirs=()

	tmp="$(mktemp -d)"
	# shellcheck disable=SC2064
	trap "rm -rf '$tmp'" RETURN

	git init -q "$tmp"
	cp "$ignore_file" "$tmp/.gitignore"

	while IFS= read -r line || [[ -n "$line" ]]; do
		line="${line%$'\r'}"
		line="${line#"${line%%[![:space:]]*}"}"
		line="${line%"${line##*[![:space:]]}"}"
		[[ -z "$line" || "$line" == \#* ]] && continue
		if [[ "$line" == !* ]]; then
			negation_pats+=("${line:1}")
			continue
		fi
		if anchor="$(directory_anchor_from_ignore_line "$line")"; then
			denied_dir_rels+=("$anchor")
		fi
	done <"$ignore_file"

	local dirs_list="$tmp/dirs.txt"
	find_paths_or_die "$dirs_list" "$tmp/dirs.err" \
		-P "$workspace" -type d ! -path "$workspace" -printf '%P\n'

	while IFS= read -r rel; do
		[[ -z "$rel" ]] && continue
		set +e
		rel_is_ignored_dir "$tmp" "$rel"
		status=$?
		set -e
		if [[ "$status" -eq 0 ]]; then
			denied_dir_rels+=("$rel")
		elif [[ "$status" -ne 1 ]]; then
			return 1
		fi
	done <"$dirs_list"

	# Unique dir rels, demote when negations need file-level allow
	local -A seen_dir_rel=()
	local dir_rel
	for dir_rel in "${denied_dir_rels[@]}"; do
		[[ -z "$dir_rel" ]] && continue
		[[ -n "${seen_dir_rel[$dir_rel]+x}" ]] && continue
		seen_dir_rel[$dir_rel]=1
		if dir_should_demote_for_negations "$dir_rel" "${negation_pats[@]+"${negation_pats[@]}"}"; then
			continue
		fi
		if ! abs="$(safe_path_under_workspace "$workspace" "$dir_rel")"; then
			continue
		fi
		if [[ -d "$abs" ]]; then
			denied_dirs+=("$abs")
		fi
	done

	# Collapse nested denied dirs (parent deny is enough)
	local -a collapsed_dirs=()
	local d other nested
	for d in "${denied_dirs[@]}"; do
		nested=0
		for other in "${denied_dirs[@]}"; do
			if [[ "$d" != "$other" && "$d" == "$other"/* ]]; then
				nested=1
				break
			fi
		done
		if [[ "$nested" -eq 0 ]]; then
			collapsed_dirs+=("$d")
		fi
	done
	denied_dirs=("${collapsed_dirs[@]}")

	for d in "${denied_dirs[@]}"; do
		printf 'dir\t%s\n' "$d"
	done

	local files_list="$tmp/files.txt"
	local ignored_files="$tmp/ignored.txt"
	find_paths_or_die "$files_list" "$tmp/files.err" \
		-P "$workspace" \( -type f -o -type l \) ! -path "$workspace" -printf '%P\n'

	if ! git_check_ignore_list "$tmp" "$files_list" >"$ignored_files"; then
		return 1
	fi

	while IFS= read -r rel; do
		[[ -z "$rel" ]] && continue
		if ! abs="$(safe_path_under_workspace "$workspace" "$rel")"; then
			continue
		fi
		skip=0
		for d in "${denied_dirs[@]}"; do
			case "$abs" in
				"$d" | "$d"/*) skip=1; break ;;
			esac
		done
		if [[ "$skip" -eq 1 ]]; then
			continue
		fi
		if [[ -f "$abs" ]]; then
			printf 'file\t%s\n' "$abs"
		fi
	done <"$ignored_files"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
	if [[ $# -ne 1 ]]; then
		echo "usage: $0 <workspace-root>" >&2
		exit 2
	fi
	collect_cursorignore_deny_entries "$1"
fi
