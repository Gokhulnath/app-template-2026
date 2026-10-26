"""The terminal UI: the same status card as the web app, drawn with Textual."""

import json
from importlib import resources
from typing import ClassVar

from textual.app import App, ComposeResult
from textual.binding import BindingType
from textual.containers import Center, Vertical
from textual.theme import Theme
from textual.widgets import Button, Footer, Static

from myapp.client import Fetch, HealthReport, fetch_health


def status_markup(report: HealthReport) -> str:
    if report.ok:
        return "[b $success]ok[/]"
    if report.status == "degraded":
        return f"[b $warning]degraded[/] (database {report.db})"
    return f"[b $error]{report.status}[/]"


def design_system_themes() -> list[Theme]:
    """The design system's colors as Textual themes, "myapp-dark" and "myapp-light".
    theme.json is generated from packages/tokens (pnpm tokens:build), so the terminal UI
    uses the same palette as the web and desktop apps."""
    themes = json.loads(resources.files("myapp").joinpath("theme.json").read_text())
    return [
        Theme(name=f"myapp-{mode}", **{k: v for k, v in colors.items()})
        for mode, colors in themes.items()
        if mode in ("light", "dark")
    ]


class MyappApp(App[None]):
    TITLE = "myapp"
    CSS = """
    Screen { align: center middle; }
    #card { width: 64; height: auto; }
    #card > Static { width: 100%; content-align: center middle; }
    #title { text-style: bold; margin-bottom: 1; }
    .muted { color: $text-muted; }
    #check { margin-top: 1; }
    """
    BINDINGS: ClassVar[list[BindingType]] = [
        ("r", "check", "Check again"),
        ("q", "quit", "Quit"),
    ]

    def __init__(self, api_url: str, fetch: Fetch = fetch_health) -> None:
        super().__init__()
        for theme in design_system_themes():
            self.register_theme(theme)
        self.theme = "myapp-dark"
        self.api_url = api_url
        self.fetch = fetch

    def compose(self) -> ComposeResult:
        with Vertical(id="card"):
            yield Static("myapp", id="title")
            yield Static("API status: checking…", id="status")
            yield Static(f"API: {self.api_url}", classes="muted")
            yield Static("Running in: Terminal (no Origin header)", classes="muted")
            with Center():
                yield Button("Check again", id="check", compact=True)
        yield Footer()

    def on_mount(self) -> None:
        self.action_check()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        self.action_check()

    def action_check(self) -> None:
        self.run_worker(self._check(), exclusive=True)

    async def _check(self) -> None:
        label = self.query_one("#status", Static)
        label.update("API status: checking…")
        report = await self.fetch(self.api_url)
        label.update(f"API status: {status_markup(report)}")
