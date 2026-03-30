from app.services.user_services import update_profile, change_password
from app.schemas.user_schema import ChangePasswordRequest, UpdateProfileRequest
from fastapi import APIRouter, Request, Depends, HTTPException
from app.dependencies.auth import get_current_user
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