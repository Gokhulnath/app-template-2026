<!-- install-steps -->

## Install

The repo is private, so downloading needs a GitHub account with access to it. With the
[GitHub CLI](https://cli.github.com/), sign in once with `gh auth login`.

### Desktop app

Download the installer for your OS from the assets below: `.dmg` for macOS (Apple Silicon),
`.msi` or `-setup.exe` for Windows, and `.AppImage`, `.deb` or `.rpm` for Linux. They're
attached once the production API is deployed. The apps aren't code-signed yet; see
[Installing an unsigned build](https://github.com/Gokhulnath/myapp/blob/main/docs/releasing.md#installing-an-unsigned-build).

### CLI and terminal UI

Needs [uv](https://docs.astral.sh/uv/getting-started/installation/), which fetches Python
3.14 itself if it's missing.

```bash
gh release download {{tag}} --repo Gokhulnath/myapp --pattern 'myapp-{{version}}-py3-none-any.whl'
uv tool install --force ./myapp-{{version}}-py3-none-any.whl
myapp status
```

Run `myapp` on its own for the terminal UI. Set `MYAPP_API_URL` to use another API.

### MCP server

- **Claude Desktop:** download `myapp-{{version}}.mcpb` and open it. It needs uv installed.
  The API URL is a setting of the extension.
- **Claude Code:** after installing the CLI, run
  `claude mcp add --scope user myapp -- myapp mcp`.
- **Other MCP clients:** run `myapp mcp` over stdio.

### Agent Skill

The skill drives the `myapp` CLI, so install the CLI first.

- **Claude Code:**

  ```bash
  gh release download {{tag}} --repo Gokhulnath/myapp --pattern 'myapp-skill-{{version}}.zip'
  unzip -o myapp-skill-{{version}}.zip -d ~/.claude/skills
  ```

- **Claude apps:** upload `myapp-skill-{{version}}.zip` under Settings → Capabilities →
  Skills.

### Check a download

`SHA256SUMS` lists every file's checksum. Check one with
`sha256sum --check --ignore-missing SHA256SUMS`, or on macOS
`shasum -a 256 --check --ignore-missing SHA256SUMS`.
