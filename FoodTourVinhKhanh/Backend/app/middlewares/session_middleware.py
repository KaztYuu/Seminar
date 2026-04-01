from fastapi import Request
from app.services.redis_services import refresh_session

EXCLUDE_PATHS = ["/login", "/register", "/docs", "/openapi.json"]

async def session_middleware(request: Request, call_next):
    
    if request.url.path in EXCLUDE_PATHS:
        return await call_next(request)

    session_id = request.cookies.get("session_id")

    if session_id:
        refresh_session(session_id)  # reset TTL
        print(f"Session {session_id} refreshed")

    response = await call_next(request)
    return response