from fastapi import APIRouter, HTTPException, Request, Response, Depends
from app.dependencies.auth import get_current_user, require_role
from app.schemas.user_schema import UserRegister, UserLogin
from app.services.auth_services import createUser, userLogin, userLogout
from app.services.redis_services import check_and_track_visit, set_max_online_users

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
def register(user: UserRegister):

    success = createUser(user)

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Email đã tồn tại"
        )

    return {"message": "Tạo tài khoản thành công"}


@router.post("/login")
def login(user: UserLogin, response: Response):

    result = userLogin(user.email, user.password, user.deviceMetadata)

    if not result:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password or the account is blocked"
        )

    #set cookie
    response.set_cookie(
        key="session_id",
        value=result["session_id"],
        httponly=True,
        max_age=3600,  # 1 tiếng
        samesite="none",
        secure=True
    )

    return {"message": "Login success"}

@router.get("/me")
def getCurrentUser(user=Depends(get_current_user)):
    return user
    

@router.post("/logout")
def logout(request: Request, response: Response, user=Depends(get_current_user)):
    session_id = request.cookies.get("session_id")
    
    if not session_id:
        response.delete_cookie(key="session_id", httponly=True, samesite="none", secure=True)
        return {"message": "No active session"}
    
    userLogout(session_id, user["id"])
    
    response.delete_cookie(key="session_id", httponly=True, samesite="None", secure=True)
    return {"message": "Logged out successfully"}

@router.post("/track-visit")
async def track_visit(data: dict):
    visitor_id = data.get("visitor_id")
    role = data.get("role", "guest")
    
    success, message = check_and_track_visit(visitor_id, role)
    if not success:
        raise HTTPException(status_code=503, detail=message)
        
    return {"success": True}

@router.post("/set-max-users")
def set_max_users(data: dict, user=Depends(require_role("admin"))):
    max_users = data.get("max_users")
    if max_users is None or max_users < 1:
        raise HTTPException(status_code=400, detail="Invalid max_users value")
    set_max_online_users(max_users)
    return {"message": "Max users limit updated successfully"}