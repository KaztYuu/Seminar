from app.services.package_services import getPackages, createPackage, updatePackage, deletePackage
from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user, require_role
from app.schemas.package_schema import PackageCreate, PackageUpdate
from fastapi import HTTPException

router = APIRouter(prefix="/packages", tags=["Packages"])

@router.get("/get-packages")
def get_packages(user=Depends(get_current_user)):

    packages = getPackages(user)

    return {
        "success": True,
        "data": packages
        }

@router.post("/create")
def create_package(data: PackageCreate, user=Depends(require_role("admin"))):
    new_package_id = createPackage(data=data)
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
    return {
        "success" : True,
        "message" : f'Cập nhật thành công. package_id: ${package_id}'
    }

@router.delete("/delete/{package_id}")
def delete_package(package_id : int, user=Depends(require_role("admin"))):
    success = deletePackage(package_id=package_id)

    if not success:
        raise HTTPException(status_code=404, detail="Gói không tồn tại")
    
    return {
        "success" : True,
        "message" : "Xóa gói dịch vụ thành công!"
    }