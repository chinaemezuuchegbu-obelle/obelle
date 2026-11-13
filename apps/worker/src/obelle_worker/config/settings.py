from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    llm_provider: str = "openai"  # openai, anthropic, google, or ollama
    llm_model_name: str = "gpt-4o"

    # Provider credentials are read from the matching environment variables.
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    gemini_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
