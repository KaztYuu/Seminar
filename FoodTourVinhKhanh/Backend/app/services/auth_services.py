from app.database import get_db_connection
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv

from app.services.redis_services import delete_session, set_session
import uuid

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM")
TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# hash password
def hash_password(password: str):
    password = password[:72]   # bcrypt limit
    return pwd_context.hash(password)


# verify password
def verify_password(plain_password, hashed_password):
    plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)


# create jwt token
def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return token


def getUserByEmail(email):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    sql = "SELECT * FROM users WHERE email = %s AND users.is_Deleted = FALSE"

    cursor.execute(sql, (email,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()

    return user


# login
def userLogin(email, password):

    user = getUserByEmail(email)

    if not user or user["is_Blocked"]:
        return None

    if not verify_password(password, user["password"]):
        return None

    # Tạo session
    session_id = str(uuid.uuid4())
    user_data = {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "phoneNumber": user["phoneNumber"],
        "role": user["role"],
        "login_time": datetime.now(timezone.utc).isoformat()
    }
    set_session(session_id, user_data)

    # Cập nhật last_login
    conn = get_db_connection()
    cursor = conn.cursor()
    
    sql = "UPDATE users SET last_login = %s WHERE id = %s"
    cursor.execute(sql, (datetime.now(timezone.utc).isoformat(), user["id"]))
    
    conn.commit()
    cursor.close()
    conn.close()

    return {
        "user_data": user_data,
        "session_id": session_id
    }


# register
def createUser(user):

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # check email
    check_sql = "SELECT id FROM users WHERE email=%s"
    cursor.execute(check_sql, (user.email,))
    existed = cursor.fetchone()

    if existed:
        cursor.close()
        conn.close()
        return False

    # user đầu tiên tạo luôn là admin
    cursor.execute("SELECT COUNT(*) as count FROM users")
    result = cursor.fetchone()

    role = "admin" if result["count"] == 0 else user.role

    hashed_password = hash_password(user.password)

    sql = """
        INSERT INTO users(name,email,password,phoneNumber,role)
        VALUES(%s,%s,%s,%s,%s)
    """

    cursor.execute(sql, (
        user.name,
        user.email,
        hashed_password,
        user.phoneNumber,
        role
    ))

    user_id = cursor.lastrowid
    
    # Automatically create FREE subscription for vendors and tourists
    if role in ["vendor", "tourist"]:
        _create_free_subscription(cursor, user_id, role)

    conn.commit()
    cursor.close()
    conn.close()

    return True

def _create_free_subscription(cursor, user_id: int, role: str):
    """
    Create a FREE subscription for a new user.
    
    Args:
        cursor: Database cursor
        user_id: The newly created user ID
        role: User role ('vendor' or 'tourist')
    """
    try:
        free_package_name = "FREE_VENDOR" if role == "vendor" else "FREE_TOURIST"
        free_poi_limit = 1 if role == "vendor" else 0

        # Get or create FREE subscription package for this role
        cursor.execute("""
            SELECT id FROM subscription_packages
            WHERE target_role = %s AND name = %s AND price = 0
            LIMIT 1
        """, (role, free_package_name))
        
        free_pkg = cursor.fetchone()
        
        if not free_pkg:
            # Create FREE package if it doesn't exist
            cursor.execute("""
                INSERT INTO subscription_packages 
                (name, target_role, price, duration_hours, daily_poi_limit, is_Active)
                VALUES (%s, %s, 0, 999999, %s, TRUE)
            """, (free_package_name, role, free_poi_limit))
            free_pkg_id = cursor.lastrowid
        else:
            free_pkg_id = free_pkg['id']
        
        # Create a payment record for FREE subscription (for linking)
        cursor.execute("""
            INSERT INTO payments 
            (user_id, package_id, amount, transaction_ref, payment_method, status, created_at)
            VALUES (%s, %s, 0, %s, 'FREE', 'success', NOW())
        """, (user_id, free_pkg_id, f"FREE-{user_id}-{datetime.now().timestamp()}"))
        
        payment_id = cursor.lastrowid
        
        # Create subscription record (perpetual for FREE tier)
        table_name = "vendor_subscriptions" if role == "vendor" else "tourist_subscriptions"
        
        cursor.execute(f"""
            INSERT INTO {table_name} (user_id, start_time, end_time, payment_id)
            VALUES (%s, NOW(), DATE_ADD(NOW(), INTERVAL 999 YEAR), %s)
        """, (user_id, payment_id))
        
    except Exception as e:
        print(f"Error creating FREE subscription: {e}")

#logout
def userLogout(session_id: str, user_id: int):
    # Xóa session khỏi Redis
    delete_session(session_id)
