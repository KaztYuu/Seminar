from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user
from app.services.payment_services import create_payment_service

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/create")
def create_payment(data: dict, user=Depends(get_current_user)):
    return create_payment_service(
        user["id"],
        data["package_id"],
        data["payment_method"]
    )