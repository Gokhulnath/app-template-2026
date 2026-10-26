from pydantic_settings import BaseSettings, PydanticBaseSettingsSource

from api.settings import Settings


class IsolatedSettings(Settings):
    """Settings built only from the arguments given, so tests never pick up the
    developer's environment variables or .env file."""

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (init_settings,)
