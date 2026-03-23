from fastapi import APIRouter, HTTPException, Request, Response, Depends
from app.dependencies.auth import get_current_user
from app.schemas.user_schema import UserRegister, UserLogin
from app.services.auth_services import createUser, userLogin, userLogout

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
def register(user: UserRegister):

    success = createUser(user)

    if not success:
        return {"message": "Email đã tồn tại"}

    return {"message": "Tạo tài khoản thành công"}


@router.post("/login")
def login(user: UserLogin, response: Response):

    result = userLogin(user.email, user.password)

    if not result:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    #set cookie
    response.set_cookie(
        key="session_id",
        value=result["session_id"],
        httponly=True,
        max_age=300,  # 5 phút
        samesite="Lax",
        secure=False
    )

    return {"message": "Login success"}

@router.get("/currentUser")
def getCurrentUser(user=Depends(get_current_user)):
    return user
    

@router.post("/logout")
def logout(request: Request, response: Response, user=Depends(get_current_user)):
    session_id = request.cookies.get("session_id")
    
    if not session_id or not user:
        response.delete_cookie(key="session_id", httponly=True, samesite="Lax", secure=False)
        return {"message": "No active session"}
    
    userLogout(session_id, user["id"])
    
    response.delete_cookie(key="session_id", httponly=True, samesite="Lax", secure=False)
    return {"message": "Logged out successfully"}