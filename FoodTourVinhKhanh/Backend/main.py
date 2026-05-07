from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.middlewares.session_middleware import session_middleware
import logging

from app.routes.auth_router import router as auth_router
from app.routes.package_router import router as package_router
from app.routes.payment_router import router as payment_router
from app.routes.user_router import router as user_router
from app.routes.poi_router import router as poi_router
from app.routes.tour_router import router as tour_router
from fastapi.staticfiles import StaticFiles
import time
from collections import defaultdict
from fastapi.requests import Request
from starlette.middleware.base import BaseHTTPMiddleware

app = FastAPI()

# FIX P0-4: Simple in-memory rate limiting
class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FIX P0-4: Rate limiting to prevent brute force attacks.
    Limits: 100 requests per minute per IP for sensitive endpoints.
    """
    def __init__(self, app):
        super().__init__(app)
        self.request_counts = defaultdict(list)
        self.sensitive_endpoints = [
            "/auth/login",
            "/auth/signup",
            "/pois/vendor/create",
            "/tours/admin/create"
        ]
    
    async def dispatch(self, request: Request, call_next):
        # Only rate limit sensitive endpoints
        if any(request.url.path.startswith(ep) for ep in self.sensitive_endpoints):
            client_ip = request.client.host if request.client else "unknown"
            key = f"{client_ip}:{request.url.path}"
            
            now = time.time()
            # Remove requests older than 1 minute
            self.request_counts[key] = [
                req_time for req_time in self.request_counts[key]
                if now - req_time < 60
            ]
            
            # Check if exceeded rate limit (100 per minute)
            if len(self.request_counts[key]) >= 100:
                return {
                    "success": False,
                    "detail": "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
                    "status": 429
                }
            
            self.request_counts[key].append(now)
        
        response = await call_next(request)
        return response

app.add_middleware(RateLimitMiddleware)

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://seminar-murex.vercel.app", # Domain frontend ngrok
    "*" # Hoặc dùng ["*"] nếu bạn muốn mở hoàn toàn trong quá trình test
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(session_middleware)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router)
app.include_router(package_router)
app.include_router(payment_router)
app.include_router(user_router)
app.include_router(poi_router)
app.include_router(tour_router)


@app.get("/")
def home():
    return {"message": "Food Tour Vinh Khanh API running"}