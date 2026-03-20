from app.database import get_db_connection
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

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


# get user by email
def getUserByEmail(email):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    sql = "SELECT * FROM users WHERE email = %s"

    cursor.execute(sql, (email,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()

    return user


# login
def userLogin(email, password):

    user = getUserByEmail(email)

    if not user:
        return None

    if not verify_password(password, user["password"]):
        return None

    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"]
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

    # count users
    cursor.execute("SELECT COUNT(*) as count FROM users")
    result = cursor.fetchone()

    role = "admin" if result["count"] == 0 else user.role

    hashed_password = hash_password(user.password)

    sql = """
        INSERT INTO users(name,email,password,role)
        VALUES(%s,%s,%s,%s)
    """

    cursor.execute(sql, (
        user.name,
        user.email,
        hashed_password,
        role
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return True