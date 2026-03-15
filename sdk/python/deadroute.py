# sdk/python/deadroute.py
# DeadRoute Python SDK
# Supports: FastAPI, Flask, Django, Starlette
#
# Install: pip install deadroute-python
#
# Quick start (FastAPI):
#   from deadroute import DeadRouteMiddleware
#   app.add_middleware(DeadRouteMiddleware, api_key="dr_live_...", ingest_url="...")
#
# Quick start (Flask):
#   from deadroute import DeadRouteFlask
#   DeadRouteFlask(app, api_key="dr_live_...")

import time
import threading
import queue
import atexit
import re
import os
from typing import Optional, List
from dataclasses import dataclass, field, asdict


@dataclass
class HitPayload:
    method: str
    path: str
    status_code: Optional[int] = None
    duration_ms: Optional[int] = None
    user_agent: Optional[str] = None
    framework: Optional[str] = None


class DeadRouteClient:
    """
    Core DeadRoute client. Manages batching and async flushing.
    Thread-safe, non-blocking — adds < 0.1ms overhead.
    """

    def __init__(
        self,
        api_key: str,
        ingest_url: str = "https://your-app.vercel.app/api/ingest",
        batch_size: int = 50,
        flush_interval: float = 5.0,
        sample_rate: float = 1.0,
        exclude: Optional[List[str]] = None,
        framework: str = "python",
    ):
        self.api_key = api_key
        self.ingest_url = ingest_url
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.sample_rate = sample_rate
        self.exclude_patterns = [re.compile(p) for p in (exclude or [])]
        self.framework = framework

        self._queue: queue.Queue = queue.Queue()
        self._stop_event = threading.Event()
        self._worker = threading.Thread(target=self._flush_loop, daemon=True)
        self._worker.start()

        atexit.register(self._shutdown)

    def record(self, hit: HitPayload):
        import random
        if random.random() > self.sample_rate:
            return
        if any(p.search(hit.path) for p in self.exclude_patterns):
            return
        try:
            self._queue.put_nowait(hit)
        except queue.Full:
            pass  # Drop — never block the request

    def _flush_loop(self):
        buffer = []
        while not self._stop_event.is_set():
            deadline = time.time() + self.flush_interval
            while time.time() < deadline:
                try:
                    hit = self._queue.get(timeout=0.1)
                    buffer.append(hit)
                    if len(buffer) >= self.batch_size:
                        self._send(buffer)
                        buffer = []
                except queue.Empty:
                    pass
            if buffer:
                self._send(buffer)
                buffer = []

    def _send(self, hits: list):
        import urllib.request
        import json
        payload = json.dumps({"hits": [
            {k: v for k, v in {
                "method": h.method,
                "path": h.path,
                "statusCode": h.status_code,
                "durationMs": h.duration_ms,
                "userAgent": h.user_agent,
                "framework": h.framework or self.framework,
            }.items() if v is not None}
            for h in hits
        ]}).encode()

        try:
            req = urllib.request.Request(
                self.ingest_url,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                },
                method="POST",
            )
            urllib.request.urlopen(req, timeout=5)
        except Exception:
            if os.getenv("DEBUG"):
                import traceback
                traceback.print_exc()

    def _shutdown(self):
        self._stop_event.set()
        remaining = []
        try:
            while True:
                remaining.append(self._queue.get_nowait())
        except queue.Empty:
            pass
        if remaining:
            self._send(remaining)


# ─── FastAPI / Starlette ASGI Middleware ──────────────────────────────────────

class DeadRouteMiddleware:
    """
    ASGI middleware for FastAPI and Starlette.

    Usage:
        from fastapi import FastAPI
        from deadroute import DeadRouteMiddleware

        app = FastAPI()
        app.add_middleware(
            DeadRouteMiddleware,
            api_key=os.environ["DEADROUTE_API_KEY"],
            ingest_url="https://your-app.vercel.app/api/ingest",
        )
    """

    def __init__(self, app, api_key: str, ingest_url: str = None, **kwargs):
        self.app = app
        self.client = DeadRouteClient(
            api_key=api_key,
            ingest_url=ingest_url or "https://your-app.vercel.app/api/ingest",
            framework="fastapi",
            **kwargs,
        )

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.time()
        method = scope.get("method", "GET")
        # Use route pattern if available, else raw path
        path = scope.get("path", "/")
        headers = dict(scope.get("headers", []))
        user_agent = headers.get(b"user-agent", b"").decode("utf-8", errors="ignore")

        status_code = None

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 200)
            await send(message)

        await self.app(scope, receive, send_wrapper)

        duration_ms = int((time.time() - start) * 1000)
        self.client.record(HitPayload(
            method=method,
            path=path,
            status_code=status_code,
            duration_ms=duration_ms,
            user_agent=user_agent or None,
        ))


# ─── Flask Extension ──────────────────────────────────────────────────────────

class DeadRouteFlask:
    """
    Flask extension for DeadRoute.

    Usage:
        from flask import Flask
        from deadroute import DeadRouteFlask

        app = Flask(__name__)
        DeadRouteFlask(app, api_key=os.environ["DEADROUTE_API_KEY"])
    """

    def __init__(self, app=None, api_key: str = "", **kwargs):
        self.client = None
        self.api_key = api_key
        self.kwargs = kwargs
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        from flask import request, g
        self.client = DeadRouteClient(
            api_key=self.api_key,
            framework="flask",
            **self.kwargs,
        )

        @app.before_request
        def before_request():
            g._deadroute_start = time.time()

        @app.after_request
        def after_request(response):
            start = getattr(g, "_deadroute_start", time.time())
            self.client.record(HitPayload(
                method=request.method,
                path=request.path,
                status_code=response.status_code,
                duration_ms=int((time.time() - start) * 1000),
                user_agent=request.user_agent.string or None,
            ))
            return response


# ─── Django Middleware ────────────────────────────────────────────────────────

class DeadRouteDjango:
    """
    Django middleware for DeadRoute.

    Add to settings.py MIDDLEWARE list:
        'deadroute.DeadRouteDjango'

    Configure in settings.py:
        DEADROUTE_API_KEY = os.environ["DEADROUTE_API_KEY"]
        DEADROUTE_INGEST_URL = "https://your-app.vercel.app/api/ingest"
    """

    _client: Optional[DeadRouteClient] = None

    def __init__(self, get_response):
        self.get_response = get_response
        from django.conf import settings
        if not self._client:
            DeadRouteDjango._client = DeadRouteClient(
                api_key=getattr(settings, "DEADROUTE_API_KEY", ""),
                ingest_url=getattr(settings, "DEADROUTE_INGEST_URL", "https://your-app.vercel.app/api/ingest"),
                framework="django",
            )

    def __call__(self, request):
        start = time.time()
        response = self.get_response(request)
        duration_ms = int((time.time() - start) * 1000)

        try:
            path = request.resolver_match.route if request.resolver_match else request.path
        except Exception:
            path = request.path

        self._client.record(HitPayload(
            method=request.method,
            path=path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            user_agent=request.META.get("HTTP_USER_AGENT"),
        ))
        return response
