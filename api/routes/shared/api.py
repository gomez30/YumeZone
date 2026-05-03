"""
Main API blueprint - aggregates all API sub-blueprints
"""
import json

import requests
from flask import Blueprint, Response, request, session, jsonify

from .auth_api import auth_api_bp
from ..anime.anilist_api import anilist_api_bp
from .watchlist_api import watchlist_api_bp
from ..manga.manga_api import manga_api_bp
from .comments_api import comments_api_bp

api_bp = Blueprint('api', __name__)

api_bp.register_blueprint(auth_api_bp, url_prefix='/auth')
api_bp.register_blueprint(anilist_api_bp, url_prefix='/anilist')
api_bp.register_blueprint(watchlist_api_bp, url_prefix='/watchlist')
api_bp.register_blueprint(manga_api_bp, url_prefix='/manga')
api_bp.register_blueprint(comments_api_bp, url_prefix='')


def _get_client_ip():
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip
    return (request.remote_addr or "").strip()


def _proxy_json(url, params):
    try:
        upstream = requests.get(url, params=params, timeout=10)
        content = upstream.text if upstream.text else "[]"
        return Response(content, status=upstream.status_code, mimetype="application/json")
    except requests.RequestException:
        return Response(
            json.dumps({"error": "Upstream request failed"}),
            status=502,
            mimetype="application/json",
        )


@api_bp.route('/offers', methods=['GET'])
def proxy_offers():
    client_ip = _get_client_ip()
    user_agent = request.headers.get("User-Agent", "")
    return _proxy_json(
        "https://d1cdbd1x576ga0.cloudfront.net/public/offers/feed.php",
        {
            "user_id": "297501",
            "api_key": "acceaf11cc22907f24407763e97387cb",
            "ip": client_ip,
            "user_agent": user_agent,
            "s1": "yumezone",
        },
    )


@api_bp.route('/check-lead', methods=['GET'])
def proxy_check_lead():
    client_ip = _get_client_ip()
    user_agent = request.headers.get("User-Agent", "")
    return _proxy_json(
        "https://d1cdbd1x576ga0.cloudfront.net/public/external/check2.php",
        {
            "testing": "0",
            "ip": client_ip,
            "user_agent": user_agent,
        },
    )

@api_bp.route('/set-server', methods=['POST'])
def set_server():
    """Store preferred server in session"""
    data = request.get_json()
    server = data.get('server')
    if server:
        session['last_used_server'] = server
        return jsonify({'success': True})
    return jsonify({'success': False}), 400
