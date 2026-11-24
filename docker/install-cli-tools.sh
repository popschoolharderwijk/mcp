#!/usr/bin/env bash
# Install Bun, the Supabase CLI, Stripe CLI, Cursor agent, and socat into the image.
# Local Supabase is the CLI native runtime. socat proxies Docker publishes to
# loopback-only native listeners. Image has no Docker CLI or dockerd.
# Cursor publishes no checksum sidecar; SHA-256 values are pinned at bump time.
set -euo pipefail

: "${TARGETARCH:?TARGETARCH is required (amd64|arm64)}"
: "${BUN_VERSION:?}"
: "${SUPABASE_CLI_VERSION:?}"
: "${STRIPE_CLI_VERSION:?}"
: "${CURSOR_AGENT_VERSION:?}"

case "${TARGETARCH}" in
	amd64)
		BUN_ARCH=x64
		STRIPE_ARCH=x86_64
		CURSOR_AGENT_ARCH=x64
		BUN_SHA256=94559b3b528995a49452f9f2404cec74f2efd7d06e0a000a8cd214b02c3666eb
		SUPABASE_SHA256=8d12731ae522a8f263170ca719b33f163dd05f4365ae6c22b31714dfa1e92b9b
		STRIPE_SHA256=cfc9af47378a0331334b16da910812046957695244807e92706ed137b897a520
		CURSOR_AGENT_SHA256=7663b1c5d1b56e095ef8e23bef38d66df6cfd665c4873470214e0e411f0f97b3
		;;
	arm64)
		BUN_ARCH=aarch64
		STRIPE_ARCH=arm64
		CURSOR_AGENT_ARCH=arm64
		BUN_SHA256=18656a3bf0ea5641f5796ae4213b75255579a70a0fded2f337933785568cdf84
		SUPABASE_SHA256=d98ecc5e323d59f0d1c744ff5ce779098230002d8ba1df5576809f52f47746ac
		STRIPE_SHA256=57c2e6a9647291d475ab011fa7c133a9eb8b3b1fa6f589ca1ae3fe7395b79694
		CURSOR_AGENT_SHA256=7b7dd0020fb9a2a9e1e7e3f39e2f9f512d1dd9577174ecda8aa82ac31dbc9565
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
# bunx is the same binary; argv0 selects the package-runner entrypoint.
ln -sf bun /usr/local/bin/bunx
rm -rf /tmp/bun.zip "/tmp/bun-linux-${BUN_ARCH}"
bun --version
bunx --version

curl -fsSL -o /tmp/supabase.tar.gz \
	"https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_${SUPABASE_CLI_VERSION}_linux_${TARGETARCH}.tar.gz"
echo "${SUPABASE_SHA256}  /tmp/supabase.tar.gz" | sha256sum -c -
tar -xzf /tmp/supabase.tar.gz -C /tmp
install -m 755 /tmp/supabase /usr/local/bin/supabase
rm -rf /tmp/supabase /tmp/supabase.tar.gz
supabase --version

curl -fsSL -o /tmp/stripe.tar.gz \
	"https://github.com/stripe/stripe-cli/releases/download/v${STRIPE_CLI_VERSION}/stripe_${STRIPE_CLI_VERSION}_linux_${STRIPE_ARCH}.tar.gz"
echo "${STRIPE_SHA256}  /tmp/stripe.tar.gz" | sha256sum -c -
tar -xzf /tmp/stripe.tar.gz -C /tmp
install -m 755 /tmp/stripe /usr/local/bin/stripe
rm -rf /tmp/stripe /tmp/stripe.tar.gz
stripe --version

CURSOR_AGENT_DIR="/opt/cursor-agent/versions/${CURSOR_AGENT_VERSION}"
curl -fsSL -o /tmp/cursor-agent.tar.gz \
	"https://downloads.cursor.com/lab/${CURSOR_AGENT_VERSION}/linux/${CURSOR_AGENT_ARCH}/agent-cli-package.tar.gz"
echo "${CURSOR_AGENT_SHA256}  /tmp/cursor-agent.tar.gz" | sha256sum -c -
mkdir -p "${CURSOR_AGENT_DIR}"
tar --strip-components=1 -xzf /tmp/cursor-agent.tar.gz -C "${CURSOR_AGENT_DIR}"
rm -f /tmp/cursor-agent.tar.gz
ln -sfn "${CURSOR_AGENT_DIR}/cursor-agent" /usr/local/bin/agent
ln -sfn "${CURSOR_AGENT_DIR}/cursor-agent" /usr/local/bin/cursor-agent
agent --version

rm -rf /var/lib/apt/lists/*
