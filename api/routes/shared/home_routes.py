"""
Home and index routes
"""
import asyncio
from flask import Blueprint, redirect, render_template, current_app, make_response
from ...core.cache_headers import apply_cache

home_routes_bp = Blueprint('home_routes', __name__)


@home_routes_bp.route('/', methods=["GET"])
def index():
    """Landing page with Watch Anime / Read Manga"""
    return render_template("shared/landing.html", info="Welcome")


@home_routes_bp.route("/home", methods=["GET"])
def home():
    """Display home page with anime sections"""
    info = "Home"
    try:
        async def _fetch_all():
            scraper = current_app.ha_scraper
            home_data, movie_data = await asyncio.gather(
                scraper.home(),
                scraper.category("movie"),
                return_exceptions=True,
            )
            if isinstance(home_data, Exception):
                home_data = None
            if isinstance(movie_data, Exception):
                movie_data = None
            return home_data, movie_data

        data, movie_data = asyncio.run(_fetch_all())

        if data is None:
            raise RuntimeError("Failed to fetch home data")

        movies = (movie_data or {}).get("animes", [])
        current_app.logger.debug("home counts: %s", data.get("counts"))
        response = make_response(
            render_template("shared/index.html", suggestions=data, movies=movies, info=info)
        )
        return apply_cache(response, s_maxage=60, swr=30)
    except Exception as e:
        current_app.logger.exception("Unhandled error in /home")
        empty = {
            k: [] for k in [
                "latestEpisodeAnimes",
                "mostPopularAnimes",
                "spotlightAnimes",
                "trendingAnimes"
            ]
        }
        response = make_response(
            render_template(
                "shared/index.html",
                suggestions={"success": False, "data": empty, "counts": {}},
                movies=[],
                error=f"Error fetching home page data: {e}",
                info=info
            )
        )
        return apply_cache(response, s_maxage=60, swr=30)
