import os
import re
import logging
import secrets
import time
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from flask import Flask, render_template, request, abort, jsonify, session, redirect
from dotenv import load_dotenv

load_dotenv(override=False)

from api.core.config import Config
from api.providers import UnifiedScraper
from api.routes.anime import anime_routes_bp, watch_routes_bp, catalog_routes_bp, anilist_api_bp, themes_api_bp
from api.routes.manga import manga_routes_bp, manga_api_bp
from api.routes.shared import auth_bp, watchlist_bp, api_bp, home_routes_bp, search_routes_bp
from api.core.extensions import limiter

_RE_STRIP_ANIME_ID = re.compile(r'-\d+$')

# ── Urgent Announcement Mode ──────────────────────────────────────────
# Set to True to put the entire site into maintenance mode.
# All routes will display the announcement page instead of normal content.
URGENT_ANNOUNCEMENT = False

HEADLESS_PATTERNS = [
    r"headless", r"phantom", r"selenium", r"puppeteer",
    r"playwright", r"chromium", r"firefox.*headless",
    r"chrome.*headless", r"wpdt", r"webdriver",
    r"python-requests", r"go-http-client", r"curl", r"wget",
    r"scrapy", r"httpclient", r"libwww", r"jakarta", r"httpx",
]


def create_app():
    app = Flask(__name__, instance_relative_config=False)
    app.config.from_object(Config)

    try:
        Config.validate()
    except (AttributeError, Exception):
        pass

    if not app.config.get("SECRET_KEY"):
        env_secret = os.environ.get("FLASK_KEY") or os.environ.get("SECRET_KEY")
        if env_secret:
            app.config["SECRET_KEY"] = env_secret
        else:
            app.config["SECRET_KEY"] = secrets.token_urlsafe(64)
            app.logger.warning(
                "No SECRET_KEY set — using auto-generated key. Set FLASK_KEY in production."
            )

    log_level_name = getattr(Config, "LOG_LEVEL", None) or os.environ.get("LOG_LEVEL", "INFO")
    logging.basicConfig(level=getattr(logging, log_level_name.upper(), logging.INFO))

    is_debug = bool(app.config.get("DEBUG") or app.debug)
    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=not is_debug,
        TEMPLATES_AUTO_RELOAD=is_debug,
    )

    app.jinja_env.filters['regex_replace'] = (
        lambda s, pat, rep: re.sub(pat, rep, str(s)) if s is not None else ''
    )
    app.jinja_env.filters['strip_anime_id'] = (
        lambda s: _RE_STRIP_ANIME_ID.sub('', str(s)) if s is not None else ''
    )

    def _manga_cover_proxy(url, referer=''):
        """Proxy manga cover images through the image proxy to bypass referer restrictions."""
        if not url:
            return ''
        from urllib.parse import quote
        # Ensure url and referer are strings
        url = str(url) if url is not None else ''
        referer = str(referer) if referer is not None else ''
        if not url:
            return ''
        return f'/api/manga/image-proxy?url={quote(url, safe="")}&referer={quote(referer, safe="")}'

    app.jinja_env.filters['manga_cover'] = _manga_cover_proxy

    app.ha_scraper = UnifiedScraper()
    limiter.init_app(app)

    # Register blueprints
    app.register_blueprint(home_routes_bp)
    app.register_blueprint(search_routes_bp)
    app.register_blueprint(anime_routes_bp)
    app.register_blueprint(watch_routes_bp)
    app.register_blueprint(catalog_routes_bp)
    app.register_blueprint(themes_api_bp)
    app.register_blueprint(manga_routes_bp)
    app.register_blueprint(auth_bp,      url_prefix='/auth')
    app.register_blueprint(watchlist_bp, url_prefix='/watchlist')
    app.register_blueprint(api_bp,       url_prefix='/api')
    health_cache = {
        "checked_at": 0.0,
        "is_healthy": True,
    }

    def _is_redirect_target_healthy():
        if not app.config.get("REDIRECT_HEALTHCHECK_ENABLED", False):
            return True

        now = time.time()
        ttl_seconds = int(app.config.get("REDIRECT_HEALTHCHECK_TTL_SECONDS", 60))
        if now - health_cache["checked_at"] < ttl_seconds:
            return bool(health_cache["is_healthy"])

        target_origin = str(
            app.config.get("REDIRECT_TARGET_ORIGIN", "https://animeobt.com")
        ).rstrip("/")
        health_path = str(app.config.get("REDIRECT_HEALTHCHECK_PATH", "/healthz") or "/healthz")
        if not health_path.startswith("/"):
            health_path = "/" + health_path
        timeout_ms = int(app.config.get("REDIRECT_HEALTHCHECK_TIMEOUT_MS", 1200))
        timeout_seconds = max(0.2, timeout_ms / 1000.0)
        health_url = f"{target_origin}{health_path}"

        is_healthy = False
        try:
            req = Request(health_url, method="GET")
            with urlopen(req, timeout=timeout_seconds) as resp:
                status_code = getattr(resp, "status", resp.getcode())
                is_healthy = 200 <= int(status_code) < 400
        except Exception as exc:
            app.logger.warning("Redirect health check failed for %s: %s", health_url, exc)
            is_healthy = False

        health_cache["checked_at"] = now
        health_cache["is_healthy"] = is_healthy
        return is_healthy

    @app.context_processor
    def inject_redirect_config():
        target_origin = str(
            app.config.get("REDIRECT_TARGET_ORIGIN", "https://animeobt.com")
        ).rstrip("/")
        return {
            "redirect_to_vps": bool(app.config.get("REDIRECT_TO_VPS", False)),
            "redirect_target_origin": target_origin,
        }

    @app.before_request
    def redirect_selected_routes_to_vps():
        if not app.config.get("REDIRECT_TO_VPS", False):
            return

        path = request.path or "/"
        normalized_path = path.rstrip("/") or "/"

        excluded_exact_paths = {"/", "/home", "/healthz", "/favicon.ico", "/robots.txt", "/sitemap.xml"}
        excluded_prefixes = ("/static/", "/api/", "/auth/", "/watchlist/")
        redirect_prefixes = ("/watch/", "/manga", "/search", "/category/", "/anime/")

        if normalized_path in excluded_exact_paths:
            return
        if path.startswith(excluded_prefixes):
            return
        if not path.startswith(redirect_prefixes):
            return

        target_origin = str(
            app.config.get("REDIRECT_TARGET_ORIGIN", "https://animeobt.com")
        ).rstrip("/")
        target_host = (urlsplit(target_origin).netloc or "").lower()
        request_host = (request.host or "").lower()
        if target_host and request_host == target_host:
            return

        if not _is_redirect_target_healthy():
            app.logger.warning("Skipping redirect for %s because target health check is failing", path)
            return

        query_string = request.query_string.decode("utf-8") if request.query_string else ""
        destination = f"{target_origin}{path}"
        if query_string:
            destination = f"{destination}?{query_string}"

        app.logger.info("Redirecting %s -> %s", request.url, destination)
        return redirect(destination, code=307)

    @app.route("/healthz", methods=["GET"])
    def healthz():
        return jsonify(ok=True, service="yumezone"), 200

    @app.before_request
    def check_urgent_announcement():
        if not URGENT_ANNOUNCEMENT:
            return
        if request.path.startswith('/static/'):
            return
        return render_template('shared/announcement.html'), 503

    @app.before_request
    def block_obvious_bots():
        if request.path.startswith('/static/'):
            return
        ua = request.headers.get('User-Agent', '').lower()
        if not ua or any(re.search(p, ua) for p in HEADLESS_PATTERNS):
            app.logger.warning(f"Blocked bot UA='{ua[:80]}' PATH={request.path} IP={request.remote_addr}")
            abort(403)

    @app.before_request
    def validate_session_version():
        if request.path.startswith('/static/'):
            return
        if '_id' in session:
            from api.models.user import get_user_by_id
            user = get_user_by_id(session['_id'])
            if user:
                # If password_version in DB points to a newer login/password change,
                # invalidate the current old session.
                db_version = user.get('password_version', 0)
                session_version = session.get('password_version', 0)
                if db_version != session_version:
                    session.clear()
            else:
                session.clear()


    @app.errorhandler(404)
    def page_not_found(e):
        app.logger.warning(f"404: {request.url}")
        return render_template('shared/404.html', error_message="Page not found"), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        app.logger.error(f"500: {e}")
        return render_template('shared/404.html', error_message="Internal server error"), 500

    @app.errorhandler(429)
    def ratelimit_handler(e):
        app.logger.warning(f"Rate limit: {request.url} — {request.remote_addr}")
        return jsonify(success=False, message="Too many attempts. Please try again later."), 429

    @app.after_request
    def default_cache_policy(response):
        # Only set if no explicit Cache-Control already present
        if "Cache-Control" not in response.headers:
            # Safe default: do not cache unhandled routes
            response.headers["Cache-Control"] = "no-store"
        return response

    return app


app = create_app()

if __name__ == "__main__":
    import sys
    try:
        app.run(debug=True)
    except KeyboardInterrupt:
        print("Server gracefully stopped.")
    except OSError as e:
        if getattr(e, 'winerror', None) == 10038:
            print("Server gracefully stopped (socket released).")
        else:
            raise
    except BaseException:     
        sys.exit(0)