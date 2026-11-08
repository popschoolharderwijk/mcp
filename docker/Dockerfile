FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        bash \
    && rm -rf /var/lib/apt/lists/*

COPY --from=oven/bun:1.4.4 /usr/local/bin/bun /usr/local/bin/bun

RUN useradd --create-home --shell /bin/bash --uid 1000 --user-group agent

ENV HOME=/workspace/.agent-home
ENV TMPDIR=/workspace/.tmp
ENV XDG_CONFIG_HOME=/workspace/.agent-home/.config
ENV XDG_CACHE_HOME=/workspace/.agent-home/.cache
# Runtime root is read-only. The Cursor CLI installs under HOME/.local.
ENV PATH="/workspace/.agent-home/.local/bin:${PATH}"

USER agent
WORKDIR /workspace

CMD ["sleep", "infinity"]