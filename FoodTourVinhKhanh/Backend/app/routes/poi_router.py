from fastapi import APIRouter, Depends, HTTPException, Header
from app.database import get_db_connection
from app.schemas.poi_schema import (
    POICreateAdmin,
    POICreateVendor,
    POITranslationSuggestionRequest,
    POIUpdateAdmin,
    POIUpdateVendor,
)
from app.services.poi_services import (
    getPois, createPOI, updatePOI, getPOIById, deletePOI, activate_pois,
    check_vendor_poi_limit, getPOIData, get_remaining_poi_quota,
    get_vendor_subscription_limit, get_nearby_pois, getMapData
)
from app.services.redis_services import get_cache, set_cache, invalidate_poi_cache
from app.services.gemini_services import gemini_service
from app.dependencies.auth import require_role, get_current_user
from app.dependencies.subscription import verify_active_subscription, verify_read_access, verify_read_access_public
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pois", tags=["POIs"])

@router.put("/activate")
def api_activate_pois_bulk(user=Depends(require_role("admin"))):
    success, message = activate_pois()

    if not success:
        raise HTTPException(
            status_code=500, 
            detail=message
        )
    invalidate_poi_cache()
    return {
        "success": True,
        "message": message
    }

# FEATURE 1: MAP API - Single endpoint with multiple scopes
@router.get("/map")
def api_get_pois_map(
    scope: str = "all",
    x_language_code: Optional[str] = Header(None),
    user: Optional[dict] = Depends(get_current_user)
):
    """
    FEATURE 1: Map API endpoint for POI visualization.
    
    Query Parameters:
    - scope: "all" (public map, no subscription required) or "vendor" (vendor's own POIs)
    
    Behavior:
    - scope="all": Returns approved POIs (accessible by anyone)
    - scope="vendor": Returns all vendor's POIs including pending/rejected (vendor only)
    
    No subscription check on this endpoint.
    """
    if scope not in ["all", "vendor"]:
        raise HTTPException(status_code=400, detail="Invalid scope. Use 'all' or 'vendor'")
    
    lang = x_language_code or "vi"
    
    # FEATURE 1: Cache key includes scope and user role
    cache_key = f"map_pois:{scope}:{lang}"
    if scope == "vendor" and user:
        cache_key += f":{user['id']}"
    
    # Try cache
    cached_data = get_cache(cache_key)
    if cached_data:
        return {
            "success": True,
            "data": cached_data,
            "source": "cache"
        }
    
    # Get map data
    try:
        map_data = getMapData(user, scope, lang)
        set_cache(cache_key, map_data)
        
        return {
            "success": True,
            "data": map_data,
            "source": "database"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get-pois")
def get_pois(x_language_code: Optional[str] = Header(None), search: str = "", user=Depends(verify_read_access_public)):
    lang = x_language_code or "vi"
    cache_key = f"all_pois:{user['role']}:{lang}:{search}"
    if user["role"] == "vendor":
        cache_key += f":{user['id']}"

    cached_pois = get_cache(cache_key)

    if cached_pois:
        logger.info(f"📦 Cache HIT: {cache_key} (User: {user['id']}, Role: {user['role']})")
        return {
            "success": True,
            "data": cached_pois,
            "source": "cache"
        }

    logger.info(f"🗄️  Cache MISS: {cache_key} (User: {user['id']}, Role: {user['role']}) - querying database")
    pois = getPois(user=user, lang=lang, searchTxt=search)

    set_cache(cache_key, pois)

    return {
        "success": True,
        "data": pois,
        "source": "database"
    }

@router.get("/get-poi-by-id/{poi_id}")
def get_poi_by_id(poi_id: int, x_language_code: Optional[str] = Header(None), user=Depends(verify_read_access_public)):
    lang = x_language_code or "vi"

    cache_key = f"poi_detail:{poi_id}:{lang}"
    cached_poi = get_cache(cache_key)

    if cached_poi:
        return {"success": True, "data": cached_poi, "source": "cache"}

    poi = getPOIById(user=user, poi_id=poi_id, lang=lang)

    if not poi:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy POI hoặc bạn không có quyền truy cập"
        )

    set_cache(cache_key, poi)

    return {
        "success": True,
        "data": poi,
        "source" : "database"
    }

@router.post("/admin/create")
async def create_poi_admin(data: POICreateAdmin, user=Depends(require_role("admin"))):
    success, message, poi_id = await createPOI(user, data)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    invalidate_poi_cache()
    return {"success": True, "message": message, "poi_id": poi_id}

@router.post("/vendor/create")
async def create_poi_vendor(data: POICreateVendor, user=Depends(require_role("vendor")), active_user=Depends(verify_active_subscription)):
    """
    FEATURE 2: Create a new POI with quota check based on subscription tier.
    Vendor can only create up to their daily POI limit.
    """
    
    # FEATURE 2: Check if vendor can create another POI today
    can_create = check_vendor_poi_limit(user["id"])
    
    if not can_create:
        # FEATURE 2: Return quota exceeded error
        quota = get_remaining_poi_quota(user["id"])
        raise HTTPException(
            status_code=429, 
            detail={
                "message": "POI quota exceeded. Please upgrade subscription.",
                "errorCode": "QUOTA_EXCEEDED",
                "daily_limit": quota['daily_limit'],
                "today_created": quota['today_created'],
                "remaining": 0
            }
        )
    
    success, message, poi_id = await createPOI(user, data)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    invalidate_poi_cache()
    
    quota = get_remaining_poi_quota(user["id"])
    
    return {
        "success": True, 
        "message": message, 
        "poi_id": poi_id,
        "quota": quota
    }

@router.get("/vendor/quota")
def get_vendor_quota(user=Depends(require_role("vendor")), active_user=Depends(verify_active_subscription)):
    quota = get_remaining_poi_quota(user["id"])
    quota["current_total"] = quota["today_created"]
    quota["max_pois"] = quota["daily_limit"]

    return {
        "success": True,
        "data": quota
    }

@router.put("/admin/update/{poi_id}")
async def update_poi_admin(poi_id: int, data: POIUpdateAdmin, user=Depends(require_role("admin"))):
    success, message, updated_id = await updatePOI(user, poi_id, data)
    if not success:
        status_code = 404 if "không tìm thấy" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message)
    invalidate_poi_cache(poi_id)
    return {"success": True, "message": message, "poi_id": updated_id}

@router.put("/admin/approve/{poi_id}")
def approve_poi(poi_id: int, user=Depends(require_role("admin"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE pois SET is_Active = TRUE, status = 'approved' WHERE id = %s AND is_Deleted = FALSE",
            (poi_id,)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy POI")
        conn.commit()
        invalidate_poi_cache(poi_id)
        return {"success": True, "message": "Duyệt POI thành công"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
        
@router.put("/vendor/update/{poi_id}")
async def update_poi_vendor(poi_id: int, data: POIUpdateVendor, user=Depends(require_role("vendor")), active_user=Depends(verify_active_subscription)):
    success, message, updated_poi_id = await updatePOI(user, poi_id, data)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    invalidate_poi_cache(poi_id)
    return {"success": True, "message": message, "poi_id": updated_poi_id}

@router.delete("/delete/{poi_id}")
async def delete_poi(poi_id: int, user=Depends(require_role(["vendor", "admin"])), active_user=Depends(verify_active_subscription)):
    success, message = await deletePOI(user=user, poi_id=poi_id)
    if not success:
        if "không phải chủ sở hữu" in message.lower():
            status_code = 403
        elif "không tồn tại" in message.lower():
            status_code = 404
        else:
            status_code = 500
            
        raise HTTPException(status_code=status_code, detail=message)
    invalidate_poi_cache(poi_id)
    return {"success": True, "message": message}

@router.get("/nearby")
def get_nearby_pois_endpoint(
    latitude: float, 
    longitude: float, 
    radius: float = 5.0,
    x_language_code: Optional[str] = Header(None),
    user=Depends(verify_active_subscription)
):
    """
    Get POIs within a specified radius (Map Explore feature).
    
    Parameters:
    - latitude: User's latitude (-90 to 90)
    - longitude: User's longitude (-180 to 180)
    - radius: Search radius in kilometers (default 5, max 50)
    - x_language_code: Language code (default 'vi')
    
    Example: GET /pois/nearby?latitude=10.76&longitude=106.66&radius=5
    """
    
    # Validate coordinates
    if not (-90 <= latitude <= 90):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
    if not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
    
    # Limit radius to prevent excessive queries
    if radius < 0.1 or radius > 50:
        raise HTTPException(status_code=400, detail="Radius must be between 0.1 and 50 km")
    
    lang = x_language_code or "vi"
    
    # Check cache first
    cache_key = f"nearby_pois:{latitude}:{longitude}:{radius}:{lang}:{user['role']}:{user['id']}"
    cached_result = get_cache(cache_key)
    
    if cached_result:
        return {
            "success": True,
            "data": cached_result,
            "source": "cache",
            "count": len(cached_result)
        }
    
    # Get nearby POIs
    pois = get_nearby_pois(user, latitude, longitude, radius, lang)
    
    # Cache for 5 minutes
    set_cache(cache_key, pois, expire=300)
    
    return {
        "success": True,
        "data": pois,
        "source": "database",
        "count": len(pois),
        "search_params": {
            "latitude": latitude,
            "longitude": longitude,
            "radius_km": radius
        }
    }

@router.get("/ai/chat")
async def ask_poi(poi_id: int, question: str):

    success, context_text = getPOIData(poi_id=poi_id)

    if not success:
        raise HTTPException(status_code=500, detail="Lỗi truy vấn dữ liệu quán")

    answer = await gemini_service.chat_with_rag(user_query=question, context=context_text)
    
    return {
        "success": True, 
        "data": {
            "answer": answer,
            "poi_id": poi_id
        }
    }

@router.get("/ai/tts")
async def text_to_speech(text: str, language: str = "vi"):
    """
    Convert text to speech using Edge TTS.
    
    Query Parameters:
    - text: Text to convert to speech (required)
    - language: Language code - vi, en, fr, kr, ja (default: vi)
    
    Returns base64 encoded MP3 audio
    """
    if not text or len(text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text không được để trống")
    
    result = await gemini_service.text_to_speech(text=text, language=language)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=f"TTS failed: {result.get('error')}")
    
    return {
        "success": True,
        "audio_base64": result["audio_base64"],
        "language": result["language"]
    }

@router.post("/suggestions/translate/{lang_code}")
async def suggest_translation(
    lang_code: str,
    payload: POITranslationSuggestionRequest,
):
    lang = lang_code.lower()
    if lang == "vi":
        raise HTTPException(status_code=400, detail="Không cần dịch cho tiếng Việt")

    suggestion = await gemini_service.translate_single_language(
        name=payload.name,
        description=payload.description,
        target_lang=lang,
    )

    return {
        "success": True,
        "data": suggestion,
    }
