from fastapi import APIRouter, Depends, HTTPException
from app.schemas.tour_schema import TourCreate, TourUpdate
from app.services.tour_services import getTours, getToursAdmin, getTourById, createTour, updateTour, deleteTour
from app.dependencies.auth import require_role
from app.dependencies.subscription import verify_active_subscription

router = APIRouter(prefix="/tours", tags=["Tours"])


# ===== ADMIN =====

@router.get("/admin")
def api_get_tours_admin(user=Depends(require_role("admin"))):
    """Admin xem tất cả tour"""
    tours = getToursAdmin()
    return {"success": True, "data": tours}


@router.post("/admin/create")
def api_create_tour(data: TourCreate, user=Depends(require_role("admin"))):
    """Admin tạo tour mới"""
    tour_id = createTour(data)
    return {"success": True, "id": tour_id}


@router.put("/admin/update/{tour_id}")
def api_update_tour(tour_id: int, data: TourUpdate, user=Depends(require_role("admin"))):
    """Admin cập nhật tour"""
    updateTour(tour_id, data)
    return {"success": True}


@router.delete("/admin/delete/{tour_id}")
def api_delete_tour(tour_id: int, user=Depends(require_role("admin"))):
    """Admin xóa tour"""
    deleteTour(tour_id)
    return {"success": True}


# ===== TOURIST =====

@router.get("/")
def api_get_tours(user=Depends(verify_active_subscription)):
    """Tourist xem danh sách tour đang hoạt động"""
    tours = getTours()
    return {"success": True, "data": tours}


@router.get("/{tour_id}")
def api_get_tour_by_id(tour_id: int, user=Depends(verify_active_subscription)):
    """Tourist xem chi tiết 1 tour"""
    tour = getTourById(tour_id)
    return {"success": True, "data": tour}
