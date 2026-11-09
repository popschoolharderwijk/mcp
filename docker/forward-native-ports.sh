#!/usr/bin/env bash
# Proxy Docker-published container ports to the native stack on 127.0.0.1.
# Keep pairs in sync with .devcontainer/compose.yml host publishes.
set -euo pipefail

forwards=(
	64420:54420
	64421:54421
	64422:54422
	64423:54423
	64424:54424
	64425:54425
	64426:54426
	64427:54427
	64428:54428
	64429:54429
	18183:8183
)

for pair in "${forwards[@]}"; do
	proxy="${pair%%:*}"
	target="${pair##*:}"
	socat "TCP-LISTEN:${proxy},fork,reuseaddr,bind=0.0.0.0" "TCP:127.0.0.1:${target}" &
done
