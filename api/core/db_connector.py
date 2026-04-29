# core/db_connector.py
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

db_name = os.getenv("db", "yume-userdata")
users_collection_name = os.getenv("users_collection", "users")
watchlist_collection_name = os.getenv("watchlist_collection", "watchlist")
comments_collection_name = os.getenv("comments_collection", "comments")
episode_reactions_collection_name = os.getenv("episode_reactions_collection", "episode_reactions")

# Centralized MongoDB connection with optimizations
mongodb_uri = os.getenv("MONGODB_URI")
DB_ENABLED = bool(mongodb_uri)


class _DisabledCursor(list):
    """A minimal list-backed cursor for DB-disabled mode."""

    def sort(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self


class _WriteResult:
    """Mimics pymongo write result attributes used in the app."""

    def __init__(self, matched_count=0, modified_count=0, deleted_count=0, inserted_id=None, upserted_id=None):
        self.matched_count = matched_count
        self.modified_count = modified_count
        self.deleted_count = deleted_count
        self.inserted_id = inserted_id
        self.upserted_id = upserted_id


class DisabledCollection:
    """No-op collection used when MongoDB is not configured."""

    def create_index(self, *args, **kwargs):
        return None

    def drop_indexes(self, *args, **kwargs):
        return None

    def find(self, *args, **kwargs):
        return _DisabledCursor()

    def aggregate(self, *args, **kwargs):
        return []

    def find_one(self, *args, **kwargs):
        return None

    def update_one(self, *args, **kwargs):
        return _WriteResult()

    def insert_one(self, *args, **kwargs):
        return _WriteResult(inserted_id=None)

    def delete_one(self, *args, **kwargs):
        return _WriteResult(deleted_count=0)

    def count_documents(self, *args, **kwargs):
        return 0


if DB_ENABLED:
    client = MongoClient(
        mongodb_uri,
        maxPoolSize=50,
        minPoolSize=5,
        compressors=["snappy", "zlib"],
    )
    db = client[db_name]
    users_collection = db[users_collection_name]
    watchlist_collection = db[watchlist_collection_name]
    comments_collection = db[comments_collection_name]
    episode_reactions_collection = db[episode_reactions_collection_name]
else:
    client = None
    db = None
    users_collection = DisabledCollection()
    watchlist_collection = DisabledCollection()
    comments_collection = DisabledCollection()
    episode_reactions_collection = DisabledCollection()
