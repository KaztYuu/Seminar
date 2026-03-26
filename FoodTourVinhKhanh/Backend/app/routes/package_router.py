from app.services.package_service import get_packages_by_role
from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/packages", tags=["Packages"])

@router.get("/")
def get_packages(user=Depends(get_current_user)):
    role = user["role"]

    if role == "admin":
        # packages = get_all_packages()
        pass
    else:
        packages = get_packages_by_role(role)

    return {
        "success": True,
        "data": packages
        }