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
		BUN_SHA256=bf8ccbfb2b0b80159e0f9a6d15c55317add8077534dbc6130a3edb52fccb395c
		SUPABASE_SHA256=eeb61edcd59a4735fcb5e58596574f25d03d420efca779f43ddb307e1cc5c754
		STRIPE_SHA256=c710bdb63045ea8e4c3d218efe4c269a90a32bd807c1306a29438e54f80bcfdc
		CURSOR_AGENT_SHA256=170b77786cbf4c93064d64fff12b71a178b968730561c64afc2e8e752535442e
		;;
	arm64)
		BUN_ARCH=aarch64
		STRIPE_ARCH=arm64
		CURSOR_AGENT_ARCH=arm64
		BUN_SHA256=baa6bb36f51d6e58561e02bbea825038a9df454f673d6d776e8bbf86f8c7850e
		SUPABASE_SHA256=243474fb5b491a0df04682fc1941cc5519559a1178ae01c225c633eda2e8acb8
		STRIPE_SHA256=026132ef249b838734df3fa21f41d5b637101c09ccb287015f5bd12df60f38fe
		CURSOR_AGENT_SHA256=131554bfdbf683d8ebfef83a2bb46ac4e5d060f198711040b07ed063c2471871
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
