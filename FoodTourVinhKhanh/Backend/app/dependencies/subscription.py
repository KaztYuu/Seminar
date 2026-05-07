from fastapi import Depends, HTTPException, status
from app.services.subscription_services import check_subscription_active
from app.dependencies.auth import get_current_user, get_optional_user

async def verify_active_subscription(user = Depends(get_current_user)):

    if not check_subscription_active(user=user):
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Gói dịch vụ đã hết hạn",
                "errorCode": "SUBSCRIPTION_EXPIRED"
            }
        )
    return user

# FIX P0-3: New dependency for read access (tourists don't need subscription for read)
async def verify_read_access(user = Depends(get_current_user)):
    """
    FIX P0-3: Allow tourists to read POI/tour data without subscription.
    Subscription only required for vendors (write operations).
    """
    if user["role"] == "vendor":
        # Vendors need active subscription for any access
        if not check_subscription_active(user=user):
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Gói dịch vụ đã hết hạn",
                    "errorCode": "SUBSCRIPTION_EXPIRED"
                }
            )
    # Admin and tourist can always read
    return user


async def verify_read_access_public(user = Depends(get_optional_user)):
    """
    PUBLIC ACCESS: Allow unauthenticated users (public tourists) to read POI data.
    - Public tourists: Full read access
    - Authenticated tourists: Full read access
    - Vendors: Subscription check required
    - Admin: Full access
    """
    if user["role"] == "vendor":
        # Vendors need active subscription for any access
        if not check_subscription_active(user=user):
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Gói dịch vụ đã hết hạn",
                    "errorCode": "SUBSCRIPTION_EXPIRED"
                }
            )
    # Admin, authenticated tourists, and public tourists can read
    return user
