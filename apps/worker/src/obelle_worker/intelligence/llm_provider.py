from livekit.plugins import anthropic, google, openai

from obelle_worker.config.settings import Settings


def get_llm_model(settings: Settings):
    """Build the configured LiveKit LLM model for the selected provider."""
    provider = settings.llm_provider.strip().lower()

    if provider == "openai":
        _require_api_key(settings.openai_api_key, provider)
        return openai.LLM(
            model=settings.llm_model_name,
            api_key=settings.openai_api_key,
        )
    if provider == "anthropic":
        _require_api_key(settings.anthropic_api_key, provider)
        return anthropic.LLM(
            model=settings.llm_model_name,
            api_key=settings.anthropic_api_key,
        )
    if provider == "google":
        _require_api_key(settings.gemini_api_key, provider)
        return google.LLM(
            model=settings.llm_model_name,
            api_key=settings.gemini_api_key,
        )
    if provider == "ollama":
        return openai.LLM(
            model=settings.llm_model_name,
            base_url=f"{settings.ollama_base_url.rstrip('/')}/v1",
            api_key="ollama",
        )

    raise ValueError(f"Unsupported LLM provider: {provider}")


def _require_api_key(api_key: str | None, provider: str) -> None:
    if not api_key:
        raise ValueError(f"Set the API key for the selected LLM provider: {provider}")
