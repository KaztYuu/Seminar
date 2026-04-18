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

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

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