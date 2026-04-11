import redis
import json
from datetime import datetime
from decimal import Decimal

redis_client = redis.Redis(
    host="localhost",
    port=6379,
    decode_responses=True
)

SESSION_EXPIRE = 900 # 15 phút
DEFAULT_CACHE_EXPIRE = 3600 # 1 tiếng

#Session phiên đăng nhập
def set_session(session_id, user_data):
    key = f'session:{session_id}'
    redis_client.setex(
        key,
        SESSION_EXPIRE,
        json.dumps(user_data)
    )

def get_session(session_id):
    key = f"session:{session_id}"
    data = redis_client.get(key)
    return json.loads(data) if data else None

def delete_session(session_id):
    key = f"session:{session_id}"
    redis_client.delete(key)

def refresh_session(session_id):
    key = f"session:{session_id}"
    return redis_client.expire(key, SESSION_EXPIRE)

#Cache dữ liệu
def set_cache(key, data, expire=DEFAULT_CACHE_EXPIRE):
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

def get_cache(key):
    cache_key = f"cache:{key}"
    data = redis_client.get(cache_key)
    return json.loads(data) if data else None

def delete_cache(key):
    redis_client.delete(f"cache:{key}")

def delete_cache_by_pattern(pattern):
    # Xóa cache theo pattern, ví dụ: delete_cache_by_pattern("all_pois:*")
    # Dùng khi muốn xóa cache của tất cả ngôn ngữ cùng lúc.
    
    keys = redis_client.keys(f"cache:{pattern}")
    if keys:
        redis_client.delete(*keys)

def clear_all_cache():
    keys = redis_client.keys("cache:*")
    if keys:
        redis_client.delete(*keys)

def invalidate_poi_cache(poi_id=None):
    delete_cache_by_pattern("all_pois:*")
    
    if poi_id:
        delete_cache_by_pattern(f"poi_detail:{poi_id}:*")