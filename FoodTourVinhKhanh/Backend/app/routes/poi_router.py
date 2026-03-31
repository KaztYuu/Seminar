from fastapi import APIRouter, Depends, HTTPException
from app.services.poi_services import activate_pois, getPois
from app.dependencies.auth import get_current_user, require_role

router = APIRouter(prefix="/pois", tags=["POIs"])

@router.post("/activate")
def activate_pois_api(user=Depends(require_role("vendor"))):
    success, message = activate_pois(user["id"])

    if not success:
        raise HTTPException(status_code=403, detail=message)

    return {
        "success": True,
        "message": message
    }

@router.get("/get-pois")
def get_pois_api(user=Depends(get_current_user)):
    pois = getPois(user)

    return {
        "success": True,
        "data": pois
    }