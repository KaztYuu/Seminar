from pydantic import BaseModel, Field, field_validator
from typing import Optional


# ===== POSITION =====
class POIPositionAdmin(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    audio_range: int = Field(..., gt=0)
    access_range: int = Field(..., gt=0)


class POIPositionVendor(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


# ===== LOCALIZED =====
class POILocalized(BaseModel):
    lang_code: str = Field(..., min_length=2, max_length=5)
    name: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)

    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Tên địa điểm không được để trống')
        return v

    @field_validator('description')
    @classmethod
    def description_must_not_be_empty(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Mô tả không được để trống')
        return v


# ===== BASE =====
class POIBase(BaseModel):
    thumbnail: str | None = None
    banner: str | None = None


# ===== CREATE =====
class POICreateAdmin(POIBase):
    is_active: bool = True
    position: POIPositionAdmin
    localized: POILocalized


class POICreateVendor(POIBase):
    position: POIPositionVendor
    localized: POILocalized


# ===== UPDATE =====
class POIUpdateAdmin(BaseModel):
    thumbnail: Optional[str] = None
    banner: Optional[str] = None
    is_active: Optional[bool] = None

    position: Optional[POIPositionAdmin] = None
    localized: Optional[POILocalized] = None


class POIUpdateVendor(BaseModel):
    thumbnail: Optional[str] = None
    banner: Optional[str] = None

    position: Optional[POIPositionVendor] = None
    localized: Optional[POILocalized] = None


# ===== RESPONSE =====
class POIResponse(BaseModel):
    id: int
    owner_id: int

    thumbnail: str | None
    banner: str | None
    is_active: bool

    latitude: float
    longitude: float
    range_meter: int | None

    lang_code: str
    name: str
    description: str
    audio_url: str | None