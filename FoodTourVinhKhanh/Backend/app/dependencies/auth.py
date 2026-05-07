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


def get_optional_user(request: Request):
    """
    Optional authentication for public access (tourist map).
    Returns authenticated user if session exists, otherwise returns public tourist user.
    """
    session_id = request.cookies.get("session_id")

    if session_id:
        user = get_session(session_id)
        if user:
            return user

    # Return public tourist user if no session
    return {
        "id": 0,
        "role": "tourist",
        "email": "public@tourist.local",
        "is_authenticated": False
    }

def require_role(required_roles):
    if isinstance(required_roles, str):
        roles = [required_roles]
    else:
        roles = required_roles

    def role_checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")

        return user

    return role_checker