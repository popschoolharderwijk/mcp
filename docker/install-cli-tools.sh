#!/usr/bin/env bash
# Install Bun, the Supabase CLI, and socat into the image.
# Local Supabase is the CLI native runtime. socat proxies Docker publishes to
# loopback-only native listeners. Image has no Docker CLI or dockerd.
set -euo pipefail

: "${TARGETARCH:?TARGETARCH is required (amd64|arm64)}"
: "${BUN_VERSION:?}"
: "${SUPABASE_CLI_VERSION:?}"

case "${TARGETARCH}" in
	amd64)
		BUN_ARCH=x64
		BUN_SHA256=bf8ccbfb2b0b80159e0f9a6d15c55317add8077534dbc6130a3edb52fccb395c
		SUPABASE_SHA256=eeb61edcd59a4735fcb5e58596574f25d03d420efca779f43ddb307e1cc5c754
		;;
	arm64)
		BUN_ARCH=aarch64
		BUN_SHA256=baa6bb36f51d6e58561e02bbea825038a9df454f673d6d776e8bbf86f8c7850e
		SUPABASE_SHA256=243474fb5b491a0df04682fc1941cc5519559a1178ae01c225c633eda2e8acb8
		;;
	*)
		echo "unsupported TARGETARCH=${TARGETARCH}" >&2
		exit 1
		;;
esac

apt-get update
apt-get install -y --no-install-recommends \
	ca-certificates \
	curl \
	git \
	bash \
	tar \
	unzip \
	socat

curl -fsSL -o /tmp/bun.zip \
	"https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-${BUN_ARCH}.zip"
echo "${BUN_SHA256}  /tmp/bun.zip" | sha256sum -c -
unzip -q /tmp/bun.zip -d /tmp
install -m 755 "/tmp/bun-linux-${BUN_ARCH}/bun" /usr/local/bin/bun
rm -rf /tmp/bun.zip "/tmp/bun-linux-${BUN_ARCH}"
bun --version

curl -fsSL -o /tmp/supabase.tar.gz \
	"https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_${SUPABASE_CLI_VERSION}_linux_${TARGETARCH}.tar.gz"
echo "${SUPABASE_SHA256}  /tmp/supabase.tar.gz" | sha256sum -c -
tar -xzf /tmp/supabase.tar.gz -C /tmp
install -m 755 /tmp/supabase /usr/local/bin/supabase
rm -rf /tmp/supabase /tmp/supabase.tar.gz
supabase --version

rm -rf /var/lib/apt/lists/*
