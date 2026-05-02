def apply_cache(response, s_maxage: int, swr: int = 30):
    """
    Public CDN cache for fully static public routes.
    s_maxage: Vercel CDN TTL in seconds.
    swr: stale-while-revalidate window in seconds.
    On VPS, Nginx proxy_cache reads these same headers.
    """
    response.headers["Cache-Control"] = (
        f"public, s-maxage={s_maxage}, "
        f"stale-while-revalidate={swr}"
    )
    return response


def set_no_store(response):
    """
    For geo-variant, cookie-setting, or session-reading routes.
    Prevents CDN and browser from caching entirely.
    """
    response.headers["Cache-Control"] = "no-store"
    return response
