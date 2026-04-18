from fastapi import APIRouter, Depends, Request, HTTPException
from app.services.vnpay_services import verify_vnpay
from app.dependencies.auth import get_current_user, require_role
from app.services.payment_services import create_payment_service, handle_vnpay_ipn, get_payment_history, get_all_payments
from app.services.redis_services import invalidate_poi_cache
from fastapi.responses import JSONResponse, RedirectResponse
import os

FRONTEND_URL = os.getenv("ENV_FRONTEND_URL") or 'http://localhost:5173'

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/create")
def create_payment(data: dict, user=Depends(get_current_user)):
    result = create_payment_service(
        user["id"],
        data["package_id"],
        data["payment_method"]
    )

    if not result.get("payment_url"):
        raise HTTPException(status_code=400, detail=result.get("message", "Không thể tạo thanh toán"))

    return result

@router.get("/vnpay-return")
def vnpay_return(request: Request):
    params = dict(request.query_params)

    # ❗ verify chữ ký
    if not verify_vnpay(params):
        return RedirectResponse(f'{FRONTEND_URL}/payment-result?status=invalid')

    # ❗ check kết quả
    if params.get("vnp_ResponseCode") == "00":
        return RedirectResponse(f'{FRONTEND_URL}/payment-result?status=success')
    else:
        return RedirectResponse(f'{FRONTEND_URL}/payment-result?status=failed')
    
@router.get("/vnpay-ipn")
def vnpay_ipn(request: Request):
    params = dict(request.query_params)

    result = handle_vnpay_ipn(params)

    if result.get("RspCode") == "00":
        invalidate_poi_cache()

    return JSONResponse(content=result)

@router.get("/my-payments")
def get_my_payments(user=Depends(require_role(["tourist", "vendor"]))):

    payments = get_payment_history(user["id"])

    data = [
        {
            "package_name": p["package_name"],
            "amount": float(p["amount"]),
            "payment_method": p["payment_method"],
            "duration": p["duration_hours"],
            "bought_at": p["created_at"].isoformat(),
        }
        for p in payments
    ]

    return {
        "success": True,
        "data": data
    }

@router.get("/all")
def get_all_payments_admin(user=Depends(require_role("admin"))):
    """Get all payments for admin dashboard"""
    payments = get_all_payments()

    data = [
        {
            "id": p["id"],
            "user_name": p["user_name"],
            "user_email": p["email"],
            "package_name": p["package_name"],
            "amount": float(p["amount"]),
            "payment_method": p["payment_method"],
            "duration": p["duration_hours"],
            "status": p["status"],
            "created_at": p["created_at"].isoformat(),
        }
        for p in payments
    ]

    return {
        "success": True,
        "data": data
    }
