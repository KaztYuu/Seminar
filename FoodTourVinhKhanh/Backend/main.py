from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.middlewares.session_middleware import session_middleware
import logging

from app.routes.auth_router import router as auth_router
from app.routes.package_router import router as package_router
from app.routes.payment_router import router as payment_router
from app.routes.user_router import router as user_router
from app.routes.poi_router import router as poi_router
from fastapi.staticfiles import StaticFiles

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add startup event
@app.on_event("startup")
async def startup_event():
    """Check dependencies on startup"""
    logger.info("="*50)
    logger.info("🚀 Application starting...")
    logger.info("="*50)
    
    # Check Redis
    try:
        from app.services.redis_services import get_redis_status
        redis_status = get_redis_status()
        if redis_status["available"]:
            logger.info(f"✅ Redis: Connected ({redis_status['host']}:{redis_status['port']})")
        else:
            logger.warning("⚠️  Redis: Unavailable (using database fallback)")
    except Exception as e:
        logger.warning(f"⚠️  Redis check failed: {str(e)}")
    
    # Check Database
    try:
        from app.database import get_db_connection
        conn = get_db_connection()
        if conn.is_connected():
            logger.info("✅ Database: Connected")
            conn.close()
        else:
            logger.error("❌ Database: Connection failed")
    except Exception as e:
        logger.error(f"❌ Database connection error: {str(e)}")
    
    logger.info("="*50)
    logger.info("Backend API is ready!")
    logger.info("="*50)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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


@app.get("/")
def home():
    return {"message": "Food Tour Vinh Khanh API running"}