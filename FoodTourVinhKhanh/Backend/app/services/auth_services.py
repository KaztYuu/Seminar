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

    conn.commit()

    cursor.close()
    conn.close()

    return True

#logout
def userLogout(session_id: str, user_id: int):
    # Xóa session khỏi Redis
    delete_session(session_id)