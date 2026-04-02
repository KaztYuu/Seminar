from app.services.user_services import update_profile, change_password, createUser, updateUser, getUserById, getUsers
from app.schemas.user_schema import ChangePasswordRequest, UpdateProfileRequest, CreateUserRequest, UpdateUserRequest, UserResponse
from fastapi import APIRouter, Request, Depends, HTTPException
from app.dependencies.auth import get_current_user, require_role
from app.services.redis_services import set_session, delete_session

router = APIRouter(prefix="/users", tags=["Users"])

@router.put("/me")
def update_me(data: UpdateProfileRequest, request: Request, user=Depends(get_current_user)):
    
    # 1. update DB
    update_profile(user["id"], data.name, data.phoneNumber)

    # 2. update Redis
    session_id = request.cookies.get("session_id")

    user["name"] = data.name
    user["phoneNumber"] = data.phoneNumber
    set_session(session_id, user)

    return {
        "success": True,
        "message": "Cập nhật hồ sơ thành công"
    }

@router.put("/change-password")
def change_password_api(data: ChangePasswordRequest, request: Request, user=Depends(get_current_user)):
    success, message = change_password(
        user["id"],
        data.current_password,
        data.new_password
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    session_id = request.cookies.get("session_id")
    if session_id:
        delete_session(session_id)

    return {
        "success": True,
        "message": message
        }

@router.get("/get-users")
def get_all_users(search: str = "", user=Depends(require_role("admin"))):
    users = getUsers(searchTxt=search)

    return {
        "success": True,
        "data": users
    }

@router.get("/get-user-by-id/{user_id}")
def get_user_detail(user_id: int, admin=Depends(require_role("admin"))):
    user = getUserById(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng này.")
        
    return {
        "success" : True,
        "data" : user
    }

@router.post("/create")
def create_user(data: CreateUserRequest, user=Depends(require_role("admin"))):
    success, message = createUser(data=data)

    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "success" : success,
        "message" : message
    }

@router.put("/update/{user_id}")
def update_user(user_id: int, data: UpdateUserRequest, user=Depends(require_role("admin"))):
    success, message = updateUser(user_id, data)

    if not success:
        status_code = 404 if "không tồn tại" in message else 400
        raise HTTPException(status_code=status_code, detail=message)
    
    return {
        "success": success,
        "message": message
    }