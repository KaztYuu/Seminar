from fastapi import APIRouter, Depends, Request
from app.services.vnpay_services import verify_vnpay
from app.dependencies.auth import get_current_user
from app.services.payment_services import create_payment_service, handle_vnpay_ipn
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