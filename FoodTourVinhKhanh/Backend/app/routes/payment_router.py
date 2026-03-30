from fastapi import APIRouter, Depends, Request
from app.services.vnpay_services import verify_vnpay
from app.dependencies.auth import get_current_user, require_role
from app.services.payment_services import create_payment_service, handle_vnpay_ipn, get_payment_history
from fastapi.responses import JSONResponse, RedirectResponse

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/create")
def create_payment(data: dict, user=Depends(get_current_user)):
    return create_payment_service(
        user["id"],
        data["package_id"],
        data["payment_method"]
    )

@router.get("/vnpay-return")
def vnpay_return(request: Request):
    params = dict(request.query_params)

    # ❗ verify chữ ký
    if not verify_vnpay(params):
        return RedirectResponse("http://localhost:5173/payment-result?status=invalid")

    # ❗ check kết quả
    if params.get("vnp_ResponseCode") == "00":
        return RedirectResponse("http://localhost:5173/payment-result?status=success")
    else:
        return RedirectResponse("http://localhost:5173/payment-result?status=failed")
    
@router.get("/vnpay-ipn")
def vnpay_ipn(request: Request):
    params = dict(request.query_params)

    result = handle_vnpay_ipn(params)

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