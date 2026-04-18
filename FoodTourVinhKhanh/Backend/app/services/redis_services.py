import redis
import json
import os
import logging
from datetime import datetime
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Redis configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Initialize Redis connection
try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_keepalive=True
    )
    # Test connection
    redis_client.ping()
    logger.info(f"✅ Redis connected: {REDIS_HOST}:{REDIS_PORT}")
    REDIS_AVAILABLE = True
except Exception as e:
    logger.warning(f"⚠️  Redis connection failed: {str(e)}")
    logger.warning("Cache functions will return None and use database fallback")
    redis_client = None
    REDIS_AVAILABLE = False

# Session & Cache expiration (in seconds)
SESSION_EXPIRE = 900  # 15 phút
# Development: 5 phút, Production: 1 giờ
DEFAULT_CACHE_EXPIRE = 300 if ENVIRONMENT == "development" else 3600

#Session phiên đăng nhập
def set_session(session_id, user_data):
    """Lưu session vào Redis"""
    if not REDIS_AVAILABLE:
        logger.warning("Redis unavailable - session not persisted")
        return False
    
    try:
        key = f'session:{session_id}'
        redis_client.setex(
            key,
            SESSION_EXPIRE,
            json.dumps(user_data)
        )
        logger.debug(f"Session set: {session_id}")
        return True
    except Exception as e:
        logger.error(f"Error setting session: {str(e)}")
        return False

def get_session(session_id):
    """Lấy session từ Redis"""
    if not REDIS_AVAILABLE:
        return None
    
    try:
        key = f"session:{session_id}"
        data = redis_client.get(key)
        return json.loads(data) if data else None
    except Exception as e:
        logger.error(f"Error getting session: {str(e)}")
        return None

def delete_session(session_id):
    """Xóa session khỏi Redis"""
    if not REDIS_AVAILABLE:
        return False
    
    try:
        key = f"session:{session_id}"
        redis_client.delete(key)
        logger.debug(f"Session deleted: {session_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        return False

def refresh_session(session_id):
    """Refresh session TTL"""
    if not REDIS_AVAILABLE:
        return False
    
    try:
        key = f"session:{session_id}"
        result = redis_client.expire(key, SESSION_EXPIRE)
        return bool(result)
    except Exception as e:
        logger.error(f"Error refreshing session: {str(e)}")
        return False

def count_active_sessions():
    """Đếm số người dùng đang online dựa trên session còn hiệu lực"""
    if not REDIS_AVAILABLE:
        return None

    try:
        keys = redis_client.keys("session:*")
        active_user_ids = set()

        for key in keys:
            data = redis_client.get(key)
            if not data:
                continue

            session_data = json.loads(data)
            user_id = session_data.get("id")

            if user_id is not None:
                active_user_ids.add(user_id)

        return len(active_user_ids)
    except Exception as e:
        logger.error(f"Error counting active sessions: {str(e)}")
        return None

#Cache dữ liệu
def set_cache(key, data, expire=DEFAULT_CACHE_EXPIRE):
    """Lưu dữ liệu vào cache"""
    if not REDIS_AVAILABLE:
        logger.debug("Redis unavailable - cache not set")
        return False
    
    try:
        cache_key = f"cache:{key}"
        
        def json_serial(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            if isinstance(obj, Decimal):
                return float(obj)
            try:
                return str(obj)
            except:
                raise TypeError(f"Type {type(obj)} not serializable")

        json_data = json.dumps(data, default=json_serial)
        redis_client.setex(cache_key, expire, json_data)
        logger.debug(f"Cache set: {cache_key} (TTL: {expire}s)")
        return True
    except Exception as e:
        logger.error(f"Error setting cache: {str(e)}")
        return False

def get_cache(key):
    """Lấy dữ liệu từ cache"""
    if not REDIS_AVAILABLE:
        return None
    
    try:
        cache_key = f"cache:{key}"
        data = redis_client.get(cache_key)
        if data:
            logger.debug(f"Cache hit: {cache_key}")
            return json.loads(data)
        logger.debug(f"Cache miss: {cache_key}")
        return None
    except Exception as e:
        logger.error(f"Error getting cache: {str(e)}")
        return None

def delete_cache(key):
    """Xóa một key từ cache"""
    if not REDIS_AVAILABLE:
        return False
    
    try:
        cache_key = f"cache:{key}"
        result = redis_client.delete(cache_key)
        if result:
            logger.debug(f"Cache deleted: {cache_key}")
        return bool(result)
    except Exception as e:
        logger.error(f"Error deleting cache: {str(e)}")
        return False

def delete_cache_by_pattern(pattern):
    """Xóa cache theo pattern"""
    if not REDIS_AVAILABLE:
        return False
    
    try:
        cache_pattern = f"cache:{pattern}"
        keys = redis_client.keys(cache_pattern)
        if keys:
            redis_client.delete(*keys)
            logger.info(f"Cache invalidated: {cache_pattern} ({len(keys)} keys deleted)")
            return True
        logger.debug(f"No cache keys found for pattern: {cache_pattern}")
        return False
    except Exception as e:
        logger.error(f"Error deleting cache by pattern: {str(e)}")
        return False

def clear_all_cache():
    """Xóa toàn bộ cache (development only)"""
    if not REDIS_AVAILABLE:
        return False
    
    try:
        keys = redis_client.keys("cache:*")
        if keys:
            redis_client.delete(*keys)
            logger.warning(f"⚠️  All cache cleared ({len(keys)} keys)")
            return True
        logger.info("Cache already empty")
        return False
    except Exception as e:
        logger.error(f"Error clearing all cache: {str(e)}")
        return False

def invalidate_poi_cache(poi_id=None):
    """Invalidate POI cache"""
    delete_cache_by_pattern("all_pois:*")
    
    
    if poi_id:
        delete_cache_by_pattern(f"poi_detail:{poi_id}:*")

def get_redis_status():
    """Kiểm tra trạng thái Redis"""
    return {
        "available": REDIS_AVAILABLE,
        "host": REDIS_HOST,
        "port": REDIS_PORT,
        "environment": ENVIRONMENT
    }
