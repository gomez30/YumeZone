# config.py
import os
import secrets
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)


def _env_bool(name: str, default: bool) -> bool:
    """Parse bool-like env values with a fallback default."""
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_country_codes(name: str, default_csv: str) -> set[str]:
    """Parse CSV country codes into an uppercase ISO2 set."""
    raw_value = os.getenv(name, default_csv) or default_csv
    values = [part.strip().upper() for part in raw_value.split(",")]
    return {code for code in values if len(code) == 2 and code.isalpha()}

class Config:
    """Base configuration class"""
    # Prefer FLASK_KEY for backward compatibility, then SECRET_KEY.
    SECRET_KEY = os.getenv("FLASK_KEY") or os.getenv("SECRET_KEY")

    # If no secret key is provided, create a random one for development usage.
    # WARNING: auto-generated keys are unstable across restarts and MUST NOT be used in production.
    if not SECRET_KEY:
        SECRET_KEY = secrets.token_urlsafe(64)
        _AUTO_GENERATED_SECRET = True
    else:
        _AUTO_GENERATED_SECRET = False

    PERMANENT_SESSION_LIFETIME = timedelta(days=30)

    # Cloudflare
    CLOUDFLARE_SECRET = os.getenv("CLOUDFLARE_SECRET")
    CF_SITE_KEY = os.getenv("CF_SITE_KEY")

    # AniList OAuth
    ANILIST_CLIENT_ID = os.getenv("ANILIST_CLIENT_ID")
    ANILIST_CLIENT_SECRET = os.getenv("ANILIST_CLIENT_SECRET")
    ANILIST_REDIRECT_URI = os.getenv("ANILIST_REDIRECT_URI")

    # MyAnimeList OAuth
    MAL_CLIENT_ID = os.getenv("MAL_CLIENT_ID", "").strip()
    MAL_CLIENT_SECRET = os.getenv("MAL_CLIENT_SECRET", "").strip()
    MAL_REDIRECT_URI = os.getenv("MAL_REDIRECT_URI", "").strip()

    # Application settings
    DEBUG = os.getenv("FLASK_ENV") == "development"
    IPGEOLOCATION_API_KEY = os.getenv("IPGEOLOCATION_API_KEY", "").strip()
    GEO_DEFAULT_INTERNAL_COUNTRIES = _env_country_codes(
        "GEO_DEFAULT_INTERNAL_COUNTRIES", "US,GB,CA,AU"
    )

    # Gmail SMTP (for password reset emails)
    GMAIL_USER = os.getenv("GMAIL_USER")
    GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")

    # Feature auto-detection flags
    _HAS_MONGO = bool(os.getenv("MONGODB_URI"))
    _HAS_TURNSTILE = bool(CLOUDFLARE_SECRET and CF_SITE_KEY)
    _HAS_GMAIL = bool(GMAIL_USER and GMAIL_APP_PASSWORD)
    _HAS_ANILIST = bool(ANILIST_CLIENT_ID and ANILIST_CLIENT_SECRET and ANILIST_REDIRECT_URI)
    _HAS_MAL = bool(MAL_CLIENT_ID and MAL_CLIENT_SECRET and MAL_REDIRECT_URI)

    # Optional feature gates (env-overridable)
    ENABLE_AUTH = _env_bool("ENABLE_AUTH", _HAS_MONGO)
    ENABLE_WATCHLIST = _env_bool("ENABLE_WATCHLIST", ENABLE_AUTH and _HAS_MONGO)
    ENABLE_TURNSTILE = _env_bool("ENABLE_TURNSTILE", ENABLE_AUTH and _HAS_TURNSTILE)
    ENABLE_EMAIL_RESET = _env_bool("ENABLE_EMAIL_RESET", ENABLE_AUTH and _HAS_GMAIL)
    ENABLE_ANILIST = _env_bool("ENABLE_ANILIST", ENABLE_AUTH and _HAS_ANILIST)
    ENABLE_MAL = _env_bool("ENABLE_MAL", ENABLE_AUTH and _HAS_MAL)

    @classmethod
    def validate(cls):
        """Validate feature-specific environment variables and log effective state."""
        missing = []

        if cls.ENABLE_ANILIST:
            if not cls.ANILIST_CLIENT_ID:
                missing.append("ANILIST_CLIENT_ID")
            if not cls.ANILIST_CLIENT_SECRET:
                missing.append("ANILIST_CLIENT_SECRET")
            if not cls.ANILIST_REDIRECT_URI:
                missing.append("ANILIST_REDIRECT_URI")

        if cls.ENABLE_MAL:
            if not cls.MAL_CLIENT_ID:
                missing.append("MAL_CLIENT_ID")
            if not cls.MAL_CLIENT_SECRET:
                missing.append("MAL_CLIENT_SECRET")
            if not cls.MAL_REDIRECT_URI:
                missing.append("MAL_REDIRECT_URI")

        if cls.ENABLE_TURNSTILE:
            if not cls.CF_SITE_KEY:
                missing.append("CF_SITE_KEY")
            if not cls.CLOUDFLARE_SECRET:
                missing.append("CLOUDFLARE_SECRET")

        if cls.ENABLE_EMAIL_RESET:
            if not cls.GMAIL_USER:
                missing.append("GMAIL_USER")
            if not cls.GMAIL_APP_PASSWORD:
                missing.append("GMAIL_APP_PASSWORD")

        if cls.ENABLE_AUTH and not cls._HAS_MONGO:
            missing.append("MONGODB_URI")

        if missing:
            logger.warning("Missing environment variables: %s", ", ".join(missing))

        logger.info(
            "Feature flags - auth=%s watchlist=%s turnstile=%s email_reset=%s anilist=%s mal=%s",
            cls.ENABLE_AUTH,
            cls.ENABLE_WATCHLIST,
            cls.ENABLE_TURNSTILE,
            cls.ENABLE_EMAIL_RESET,
            cls.ENABLE_ANILIST,
            cls.ENABLE_MAL,
        )


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
