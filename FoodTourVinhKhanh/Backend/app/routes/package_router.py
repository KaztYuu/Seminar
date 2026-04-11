from app.services.package_services import getMyPackage, getPackages, createPackage, updatePackage, deletePackage
from app.services.redis_services import set_cache, get_cache, delete_cache_by_pattern
from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user, require_role
from app.schemas.package_schema import PackageCreate, PackageUpdate
from fastapi import HTTPException

router = APIRouter(prefix="/packages", tags=["Packages"])

PACKAGES_CACHE_PREFIX = "packages_list"

@router.get("/get-my-package")
def get_my_package(user=Depends(require_role(["vendor", "tourist"]))):
    myPackage = getMyPackage(user["id"], user["role"])
    if not myPackage:
        return {
            "success": True,
            "data": None,
            "message": "Bạn chưa có gói dịch vụ nào đang hoạt động"
        }

    return {
        "success": True,
        "data": myPackage
    }

@router.get("/get-all")
def get_all_packages(user=Depends(require_role("admin"))):
    """Get all packages for admin management"""
    packages = getPackages(user)
    
    return {
        "success": True,
        "data": packages
    }

@router.get("/get-packages")
def get_packages(user=Depends(get_current_user)):

    role_specific_key = f"{PACKAGES_CACHE_PREFIX}:{user['role']}"
    cached_packages = get_cache(role_specific_key)

    if cached_packages:
        return {
            "success": True,
            "data": cached_packages,
            "source" : "cache"
        }

    packages = getPackages(user)

    set_cache(role_specific_key, packages, expire=86400)

    return {
        "success": True,
        "data": packages,
        "source" : "cache"
    }

@router.post("/create")
def create_package(data: PackageCreate, user=Depends(require_role("admin"))):
    new_package_id = createPackage(data=data)

    if new_package_id:
        delete_cache_by_pattern(f"{PACKAGES_CACHE_PREFIX}:*")

    return {
        "success": True,
        "message": "Tạo gói thành công",
        "data": {"id": new_package_id}
    }

@router.put("/update/{package_id}")
def update_package(package_id: int, data: PackageUpdate, user=Depends(require_role("admin"))):
    update_data = data.model_dump(exclude_unset=True)

    success = updatePackage(package_id=package_id, data=update_data)

    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói hoặc không có thay đổi")
    
    delete_cache_by_pattern(f"{PACKAGES_CACHE_PREFIX}:*")
    return {
        "success" : True,
        "message" : f'Cập nhật thành công. package_id: ${package_id}'
    }

@router.delete("/delete/{package_id}")
def delete_package(package_id : int, user=Depends(require_role("admin"))):
    success = deletePackage(package_id=package_id)

    if not success:
        raise HTTPException(status_code=404, detail="Gói không tồn tại")
    
    delete_cache_by_pattern(f"{PACKAGES_CACHE_PREFIX}:*")
    return {
        "success" : True,
        "message" : "Xóa gói dịch vụ thành công!"
    }