from fastapi import Request, HTTPException, Depends
from app.services.redis_services import get_session


def get_current_user(request: Request):
    session_id = request.cookies.get("session_id")

    if not session_id:
        raise HTTPException(status_code=401, detail="Not logged in")

    user = get_session(session_id)

    if not user:
        raise HTTPException(status_code=401, detail="Session expired")

    return user

def require_role(required_role: str):
    def role_checker(user=Depends(get_current_user)):

        if user["role"] != required_role:
            raise HTTPException(status_code=403, detail="Forbidden")

        return user

    return role_checker