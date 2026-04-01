from app.services.package_services import getPackages
from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/packages", tags=["Packages"])

@router.get("/")
def get_packages(user=Depends(get_current_user)):

    packages = getPackages(user)

    return {
        "success": True,
        "data": packages
        }