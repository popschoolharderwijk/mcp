#!/usr/bin/env bash
# Seed bind-mounted agent HOME. Image-layer skel under /workspace is hidden by the
# repo mount, so interactive bash config must be written here at container start.
set -euo pipefail

: "${HOME:?HOME must be set}"

mkdir -p \
	"$HOME" \
	"${TMPDIR:-/workspace/.tmp}" \
	"${XDG_CONFIG_HOME:-$HOME/.config}" \
	"${XDG_CACHE_HOME:-$HOME/.cache}"

# Dev Containers drops CommonJS helpers in TMPDIR. Node walks up to
# /workspace/package.json ("type": "module") and would load those helpers as ESM.
printf '%s\n' '{"type":"commonjs"}' >"${TMPDIR:-/workspace/.tmp}/package.json"

# Thin entrypoint only — edit docker/agent.bashrc for prompt, aliases, and colors.
cat >"$HOME/.bashrc" <<'EOF'
# Managed entrypoint for the container agent user. Real config: docker/agent.bashrc.
[ -f /workspace/docker/agent.bashrc ] && . /workspace/docker/agent.bashrc
EOF

if [ ! -f "$HOME/.profile" ]; then
	cat >"$HOME/.profile" <<'EOF'
# if running bash
if [ -n "${BASH_VERSION:-}" ]; then
	if [ -f "$HOME/.bashrc" ]; then
		. "$HOME/.bashrc"
	fi
fi
EOF
fi
