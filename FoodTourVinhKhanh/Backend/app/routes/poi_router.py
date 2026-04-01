from fastapi import APIRouter, Depends, HTTPException
from app.schemas.poi_schema import POICreateAdmin, POICreateVendor
from app.services.poi_services import activate_pois, getPois, createPOI
from app.dependencies.auth import get_current_user, require_role

router = APIRouter(prefix="/pois", tags=["POIs"])

@router.post("/activate")
def activate_pois(user=Depends(require_role("vendor"))):
    success, message = activate_pois(user["id"])

    if not success:
        raise HTTPException(status_code=403, detail=message)

    return {
        "success": True,
        "message": message
    }

@router.get("/get-pois")
def get_pois(user=Depends(get_current_user)):
    pois = getPois(user)

    return {
        "success": True,
        "data": pois
    }

@router.post("/admin/create")
async def create_poi_admin(data: POICreateAdmin, user=Depends(require_role("admin"))):
    success, message, poi_id = await createPOI(user, data)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message, "poi_id": poi_id}

@router.post("/vendor/create")
async def create_poi_vendor(data: POICreateVendor, user=Depends(require_role("vendor"))):
    success, message, poi_id = await createPOI(user, data)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message, "poi_id": poi_id}