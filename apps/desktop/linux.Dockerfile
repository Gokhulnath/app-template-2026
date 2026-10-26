# Builder image for the desktop app's Linux bundles, used by scripts/build-desktop-linux.sh
# as the local pre-merge check for Linux. The installers people download are built by the
# release workflow (.github/workflows/desktop.yml) on GitHub's x86_64 Ubuntu runner.
#
# Node 26 on Debian 12 (bookworm), multi-arch, so the same file builds natively on an Apple
# Silicon Mac (linux/arm64) or emulated as linux/amd64.
FROM node:26-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Tauri 2's Linux prerequisites (https://v2.tauri.app/start/prerequisites/), plus
# pkg-config for the -sys crates. The bundler writes .deb and .rpm itself and runs
# linuxdeploy for the AppImage without FUSE, so no packaging tools or extra privileges.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      ca-certificates \
      curl \
      file \
      git \
      libayatana-appindicator3-dev \
      librsvg2-dev \
      libssl-dev \
      libwebkit2gtk-4.1-dev \
      libxdo-dev \
      pkg-config \
      wget \
  && rm -rf /var/lib/apt/lists/*

# Rust stable, like CI's dtolnay/rust-toolchain@stable.
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
      | sh -s -- -y --profile minimal --default-toolchain stable \
  && rustc --version

# The repo's pnpm, passed in from package.json's packageManager by the build script.
ARG PNPM_VERSION
RUN test -n "$PNPM_VERSION" && npm install -g "pnpm@$PNPM_VERSION" && pnpm --version

WORKDIR /workspace
