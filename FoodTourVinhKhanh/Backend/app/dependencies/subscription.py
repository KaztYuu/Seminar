from fastapi import Depends, HTTPException, status
from app.services.subscription_services import check_subscription_active
from app.dependencies.auth import get_current_user, get_current_user_optional

async def verify_active_subscription(user = Depends(get_current_user_optional)):
    
    if user["role"] == "tourist":
        return user
    
    if not check_subscription_active(user=user):
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Gói dịch vụ đã hết hạn",
                "errorCode": "SUBSCRIPTION_EXPIRED"
            }
        )
    return user