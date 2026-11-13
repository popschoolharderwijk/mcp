# Multi-arch index digest for bookworm-slim; BuildKit selects amd64/arm64.
FROM debian:bookworm-slim@sha256:734a72b3d6142a71993b4bc580ca01d8ca687f77a2c422d96a961d3376b179bc

# BuildKit sets this from --platform; do not default it.
ARG TARGETARCH
ENV BUN_VERSION=1.4.4
ENV SUPABASE_CLI_VERSION=3.1.0
ENV STRIPE_CLI_VERSION=1.55.11
ENV CURSOR_AGENT_VERSION=2026.11.05-86047df

COPY docker/install-cli-tools.sh /tmp/install-cli-tools.sh
RUN chmod +x /tmp/install-cli-tools.sh \
	&& TARGETARCH="${TARGETARCH}" /tmp/install-cli-tools.sh \
	&& rm /tmp/install-cli-tools.sh

# Passwd home is the workspace path. The native runtime resolves ~ from the
# passwd entry, and the container root filesystem is read-only. The repo bind
# mount hides image-layer skel files here; docker/seed-agent-home.sh writes
# the interactive bash entrypoint onto the mounted HOME at container start.
RUN useradd --create-home --home-dir /workspace/.agent-home --shell /bin/bash --uid 1000 --user-group agent

ENV HOME=/workspace/.agent-home
# Native runtime database and service cache. The workspace bind-mount keeps this across image rebuilds.
ENV SUPABASE_HOME=/workspace/.agent-home/.supabase
ENV TMPDIR=/workspace/.tmp
ENV XDG_CONFIG_HOME=/workspace/.agent-home/.config
ENV XDG_CACHE_HOME=/workspace/.agent-home/.cache

USER agent
WORKDIR /workspace

CMD ["sleep", "infinity"]
