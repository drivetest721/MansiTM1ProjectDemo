"""
Simple in-process TTL cache for metadata endpoints.

Metadata (entities, departments, years, versions, scenarios, accounts, cost centres)
almost never changes between API requests, but was being re-queried on every call.
This module provides a lightweight cache so the DB is only hit once per TTL window.

Usage:
    from cache import ttl_cache

    @ttl_cache(ttl=300)          # cache for 5 minutes
    def expensive_fn(arg1, arg2):
        ...

The decorator works with regular functions (not async) and is safe for a
single-process uvicorn deployment. For multi-process / multi-worker deployments
swap this out for Redis.
"""

import time
import functools
import threading
import logging

logger = logging.getLogger(__name__)

_lock = threading.Lock()


def ttl_cache(ttl: int = 300):
    """
    Decorator that caches the return value of a function for `ttl` seconds.

    The cache key is built from all positional and keyword arguments, so
    functions with different filter arguments get separate cache entries.
    """
    def decorator(fn):
        cache: dict = {}

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            now = time.monotonic()

            with _lock:
                entry = cache.get(key)
                if entry is not None and now - entry["ts"] < ttl:
                    logger.debug(f"Cache HIT  [{fn.__qualname__}]")
                    return entry["value"]

            # Compute outside the lock so other threads aren't blocked
            result = fn(*args, **kwargs)

            with _lock:
                cache[key] = {"value": result, "ts": time.monotonic()}
                logger.debug(f"Cache MISS [{fn.__qualname__}] — stored for {ttl}s")

            return result

        def invalidate():
            """Clear all cached entries for this function."""
            with _lock:
                cache.clear()

        wrapper.invalidate = invalidate
        wrapper.cache = cache
        return wrapper

    return decorator
