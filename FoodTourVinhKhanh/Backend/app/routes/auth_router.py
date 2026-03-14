from fastapi import APIRouter, HTTPException
from app.schemas.user_schema import UserRegister, UserLogin
from app.services.auth_services import createUser, userLogin

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
def register(user: UserRegister):

    success = createUser(user)

    if not success:
        return {"message": "Email đã tồn tại"}

    return {"message": "Tạo tài khoản thành công"}


@router.post("/login")
def login(user: UserLogin):

    token = userLogin(user.email, user.password)

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    return {
        "access_token": token,
        "token_type": "bearer"
    }