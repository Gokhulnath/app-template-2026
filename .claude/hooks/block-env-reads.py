"""Claude Code PreToolUse hook: block Bash commands that read a real env file.

.claude/settings.json already denies the Read tool on env files; this covers the shell
(`cat .env.local`, `source .env`, `grep KEY .env.production`, `cp .env x`). Only reading
matters, so `ls`, `git check-ignore` or `rm` on an env file are allowed, and heredoc bodies
are ignored so writing docs that *mention* env files works. A guardrail, not a sandbox: a
determined command can still get around it.

Exit code 2 blocks the call and shows stderr to Claude.
"""

import json
import re
import shlex
import sys

READERS = {
    "cat", "bat", "less", "more", "head", "tail", "grep", "egrep", "fgrep", "rg", "ag",
    "sed", "awk", "cut", "sort", "uniq", "wc", "strings", "xxd", "od", "hexdump", "base64",
    "source", ".", "cp", "mv", "rsync", "scp", "curl", "tee", "vi", "vim", "nano", "code",
    "open", "diff", "cmp", "zip", "tar", "gzip", "dotenv", "env", "export", "xargs",
}
ENV_FILE = re.compile(r"(^|/)\.env(rc)?$|(^|/)\.env\.(?!example$)[\w.-]+$")
HEREDOC = re.compile(r"<<-?\s*(['\"]?)(\w+)\1[^\n]*\n.*?\n\s*\2\s*(\n|$)", re.DOTALL)


def reads_env_file(command: str) -> str | None:
    command = HEREDOC.sub("\n", command)
    for segment in re.split(r"[;&|\n]+|\$\(|`", command):
        try:
            words = shlex.split(segment, comments=True)
        except ValueError:
            words = segment.split()
        if not words:
            continue
        env_files = [w for w in words if ENV_FILE.search(w.lstrip("<"))]
        if not env_files:
            continue
        commands = [w for w in words if not re.match(r"^\w+=", w)]  # skip FOO=1 prefixes
        verb = commands[0].rsplit("/", 1)[-1] if commands else ""
        if verb in READERS or any(w.startswith("<") for w in words) or "<" in segment:
            return env_files[0]
    return None


def main() -> None:
    event = json.load(sys.stdin)
    if event.get("tool_name") != "Bash":
        return
    env_file = reads_env_file(event.get("tool_input", {}).get("command", ""))
    if env_file:
        print(
            f"Blocked: this command reads the env file {env_file!r}, which may hold "
            "secrets. Only .env.example files may be read (see CLAUDE.md, Secrets). Ask "
            "the owner to check or change the value instead.",
            file=sys.stderr,
        )
        sys.exit(2)


if __name__ == "__main__":
    main()
