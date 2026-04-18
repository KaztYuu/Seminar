from pydantic import BaseModel
from typing import List, Optional


# Một điểm trong tour (gồm id POI và thứ tự)
class TourPointItem(BaseModel):
    poi_id: int
    point_order: int


# Dữ liệu khi tạo tour mới
class TourCreate(BaseModel):
    name: str
    is_Active: bool = True
    points: List[TourPointItem]  # Danh sách các điểm POI trong tour


# Dữ liệu khi cập nhật tour
class TourUpdate(BaseModel):
    name: Optional[str] = None
    is_Active: Optional[bool] = None
    points: Optional[List[TourPointItem]] = None
