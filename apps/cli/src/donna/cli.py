import asyncio
import json
import sys
from dataclasses import asdict
from typing import Annotated

import typer

from donna.client import DEFAULT_API_URL, HealthReport, fetch_health

app = typer.Typer(
    help="donna from the terminal. Run `donna` in a terminal for the interactive UI."
)

ApiUrl = Annotated[
    str,
    typer.Option(
        "--api-url", envvar="DONNA_API_URL", help="Base URL of the donna API."
    ),
]
AsJson = Annotated[bool, typer.Option("--json", help="Print machine-readable JSON.")]


def interactive_terminal() -> bool:
    return sys.stdin.isatty() and sys.stdout.isatty()


@app.callback(invoke_without_command=True)
def main(ctx: typer.Context, api_url: ApiUrl = DEFAULT_API_URL) -> None:
    ctx.obj = api_url.rstrip("/")
    if ctx.invoked_subcommand is None:
        # Bare `donna` opens the UI for a person at a terminal, and never blocks a script,
        # a pipe or an agent shell waiting on a UI nobody can see.
        if interactive_terminal():
            run_tui(ctx.obj)
        else:
            typer.echo(ctx.get_help())


def run_tui(api_url: str) -> None:
    from donna.tui import DonnaApp  # Textual loads only when the UI is needed

    DonnaApp(api_url).run()


def describe(report: HealthReport) -> str:
    detail = f" (database {report.db})" if report.db else ""
    return f"API status: {report.status}{detail} · {report.api_url}"


@app.command()
def status(ctx: typer.Context, as_json: AsJson = False) -> None:
    """Check whether the API and its database are up. Exits 0 when healthy, 1 if not."""
    report = asyncio.run(fetch_health(ctx.obj))
    typer.echo(json.dumps(asdict(report)) if as_json else describe(report))
    raise typer.Exit(0 if report.ok else 1)


@app.command()
def tui(ctx: typer.Context) -> None:
    """Open the terminal UI (needs an interactive terminal)."""
    run_tui(ctx.obj)


@app.command()
def mcp(ctx: typer.Context) -> None:
    """Run the MCP server over stdio, for AI agents (Claude Code, Cursor and others)."""
    from donna.mcp_server import build_server

    # stdout carries the MCP protocol, so nothing else may print to it.
    build_server(ctx.obj).run(transport="stdio", show_banner=False)
