from fastapi import APIRouter, HTTPException, Request, Response
from app.schemas.user_schema import UserRegister, UserLogin
from app.services.auth_services import createUser, userLogin
import uuid
from app.services.redis_services import set_session, get_session, delete_session

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
def register(user: UserRegister):

    success = createUser(user)

    if not success:
        return {"message": "Email đã tồn tại"}

    return {"message": "Tạo tài khoản thành công"}


@router.post("/login")
def login(user: UserLogin, response: Response):

    user_data = userLogin(user.email, user.password)

    if not user_data:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # 👉 tạo session
    session_id = str(uuid.uuid4())

    set_session(session_id, user_data)

    # 👉 set cookie
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite="Lax",
        secure=False
    )

    return {"message": "Login success"}

@router.get("/profile")
def profile(request: Request):

    session_id = request.cookies.get("session_id")

    if not session_id:
        raise HTTPException(status_code=401)

    user = get_session(session_id)

    if not user:
        raise HTTPException(status_code=401)

    return user

@router.post("/logout")
def logout(request: Request, response: Response):

    session_id = request.cookies.get("session_id")

    if session_id:
        delete_session(session_id)

    response.delete_cookie("session_id")

    return {"message": "Logged out"}