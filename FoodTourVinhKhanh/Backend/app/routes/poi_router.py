from fastapi import APIRouter, Depends, HTTPException
from app.schemas.poi_schema import POICreateAdmin, POICreateVendor, POIUpdateAdmin, POIUpdateVendor
from app.services.poi_services import activate_pois, getPois, createPOI, updatePOI, getPOIById, deletePOI
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
def get_pois(lang: str = "vi", search: str = "", user=Depends(get_current_user)):
    pois = getPois(user=user, lang=lang, searchTxt=search)

    return {
        "success": True,
        "data": pois
    }

@router.get("/get-poi-by-id/{poi_id}")
def get_poi_by_id(poi_id: int, lang: str = "vi", user=Depends(get_current_user)):
    poi = getPOIById(user=user, poi_id=poi_id, lang=lang)

    if not poi:
        raise HTTPException(
            status_code=404, 
            detail="Không tìm thấy POI hoặc bạn không có quyền truy cập"
        )

    return {
        "success": True,
        "data": poi
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

@router.put("/admin/update/{poi_id}")
async def update_poi_admin(poi_id: int, data: POIUpdateAdmin, user=Depends(require_role("admin"))):
    success, message, updated_id = await updatePOI(user, poi_id, data)
    if not success:
        status_code = 404 if "không tìm thấy" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message)
    
    return {"success": True, "message": message, "poi_id": updated_id}

@router.put("/vendor/update/{poi_id}")
async def update_poi_vendor(poi_id: int, data: POIUpdateVendor, user=Depends(require_role("vendor"))):
    success, message, updated_poi_id = await updatePOI(user, poi_id, data)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message, "poi_id": updated_poi_id}

@router.delete("/delete/{poi_id}")
async def delete_poi(poi_id: int, user=Depends(require_role(["vendor", "admin"]))):
    success, message = await deletePOI(user=user, poi_id=poi_id)
    if not success:
        if "không phải chủ sở hữu" in message.lower():
            status_code = 403
        elif "không tồn tại" in message.lower():
            status_code = 404
        else:
            status_code = 500
            
        raise HTTPException(status_code=status_code, detail=message)
    
    return {"success": True, "message": message}