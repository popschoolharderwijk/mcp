FROM debian:bookworm-slim

# BuildKit sets this from --platform; do not default it.
ARG TARGETARCH
ENV BUN_VERSION=1.4.4
ENV SUPABASE_CLI_VERSION=3.0.0

COPY docker/install-cli-tools.sh /tmp/install-cli-tools.sh
RUN chmod +x /tmp/install-cli-tools.sh \
	&& TARGETARCH="${TARGETARCH}" /tmp/install-cli-tools.sh \
	&& rm /tmp/install-cli-tools.sh

# Passwd home is the workspace path. The native runtime resolves ~ from the
# passwd entry, and the container root filesystem is read-only.
RUN useradd --create-home --home-dir /workspace/.agent-home --shell /bin/bash --uid 1000 --user-group agent

ENV HOME=/workspace/.agent-home
# Native runtime database and service cache. The workspace bind-mount keeps this across image rebuilds.
ENV SUPABASE_HOME=/workspace/.agent-home/.supabase
ENV TMPDIR=/workspace/.tmp
ENV XDG_CONFIG_HOME=/workspace/.agent-home/.config
ENV XDG_CACHE_HOME=/workspace/.agent-home/.cache
# Runtime root is read-only. The Cursor CLI installs under HOME/.local.
ENV PATH="/workspace/.agent-home/.local/bin:${PATH}"

USER agent
WORKDIR /workspace

CMD ["sleep", "infinity"]
