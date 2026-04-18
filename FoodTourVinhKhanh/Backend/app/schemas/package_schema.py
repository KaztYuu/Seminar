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
        ge=0, 
        description="Giá gói",
        examples=[50000]
    )
    duration_hours: int = Field(
        ..., 
        gt=0, 
        description="Thời hạn sử dụng tính theo giờ",
        examples=[720]
    )
    target_role: Literal["vendor", "tourist"] = Field(
        ..., 
        description="Đối tượng áp dụng gói"
    )
    daily_poi_limit: int = Field(
        0,
        ge=0,
        description="Giới hạn tổng số POI mà vendor được phép có"
    )
    is_Active: bool = Field(True, description="Trạng thái kích hoạt")

class PackageCreate(PackageBase):
    pass

class PackageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    price: Optional[float] = Field(None, ge=0)
    duration_hours: Optional[int] = Field(None, gt=0)
    target_role: Optional[Literal["vendor", "tourist"]] = None
    daily_poi_limit: Optional[int] = Field(None, ge=0)
    is_Active: Optional[bool] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Gói nâng cấp mới",
                "price": 150000,
                "is_Active": False
            }
        }
