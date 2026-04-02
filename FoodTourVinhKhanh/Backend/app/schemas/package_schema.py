from pydantic import BaseModel, Field
from typing import Optional, Literal

class PackageBase(BaseModel):
    name: str = Field(
        ..., 
        min_length=3, 
        max_length=100, 
        description="Tên gói dịch vụ",
        examples=["Gói Vendor Vàng"]
    )
    price: float = Field(
        ..., 
        gt=999, 
        description="Giá gói (phải từ 1000 VNĐ trở lên)",
        examples=[50000]
    )
    duration_hours: int = Field(
        ..., 
        gt=0, 
        description="Thời hạn sử dụng tính theo giờ",
        examples=[720] # 30 ngày
    )
    # Dùng Literal để Swagger tạo Dropdown chọn role
    target_role: Literal["vendor", "tourist"] = Field(
        ..., 
        description="Đối tượng áp dụng gói"
    )
    is_Active: bool = Field(True, description="Trạng thái kích hoạt")

class PackageCreate(PackageBase):
    pass

class PackageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    price: Optional[float] = Field(None, gt=999)
    duration_hours: Optional[int] = Field(None, gt=0)
    target_role: Optional[Literal["vendor", "tourist"]] = None
    is_Active: Optional[bool] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Gói nâng cấp mới",
                "price": 150000,
                "is_Active": False
            }
        }