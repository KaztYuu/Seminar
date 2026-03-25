import redis
import json

redis_client = redis.Redis(
    host="localhost",
    port=6379,
    decode_responses=True
)

SESSION_EXPIRE = 20 # 5 phút

def set_session(session_id, user_data):
    redis_client.setex(
        session_id,
        SESSION_EXPIRE,
        json.dumps(user_data)
    )

def get_session(session_id):
    data = redis_client.get(session_id)
    if data:
        return json.loads(data)
    return None

def delete_session(session_id):
    redis_client.delete(session_id)

def refresh_session(session_id):
    key = f"session:{session_id}"
    if redis_client.exists(key):
        redis_client.expire(key, SESSION_EXPIRE)
        return True
    return False