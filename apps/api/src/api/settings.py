from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Origins of the packaged desktop app: Tauri on macOS/Linux, then Tauri on Windows.
DESKTOP_ORIGINS = "tauri://localhost,http://tauri.localhost"


class Settings(BaseSettings):
    # Values come from environment variables; a .env file in the working directory is the
    # fallback for local overrides.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # The API connects as the least-privilege myapp_api role. The default is the local
    # Supabase stack (pnpm db:start); the cloud URL lives only in Doppler.
    database_url: str = (
        "postgresql+asyncpg://myapp_api:myapp_api@127.0.0.1:54322/postgres"
    )
    # Seconds /health waits for the database before reporting it unavailable. A first
    # connection to a remote database (DNS, TLS, auth, SQLAlchemy's setup queries) took
    # about 2.2s from here to the cloud project, so 2s was too tight.
    db_health_timeout: float = 5.0
    # The connection pool, per API process: db_pool_size connections stay open, up to
    # db_max_overflow more open under load and close when idle, and a request that finds
    # every one busy waits db_pool_timeout seconds, then gets a 503. There's no long-lived
    # listener connection here (no /v1/events yet), so a process uses at most
    # db_pool_size + db_max_overflow connections. docs/architecture.md ("Connections") has
    # the budget across processes.
    db_pool_size: int = Field(default=5, ge=1)
    db_max_overflow: int = Field(default=5, ge=0)
    db_pool_timeout: float = Field(default=5.0, gt=0)

    # Exact origins CORS allows, comma-separated. Production adds the web app's domain.
    cors_origins: str = DESKTOP_ORIGINS
    # Also allow any http://localhost or 127.0.0.1 port (next dev, serve, tauri dev). Off
    # unless set, so a deployment that forgets it stays closed; `pnpm dev:api` turns it on.
    cors_allow_localhost: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]
