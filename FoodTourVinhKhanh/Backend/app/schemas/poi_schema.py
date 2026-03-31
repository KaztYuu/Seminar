from pydantic import BaseModel, Field
from typing import Optional


# ===== POSITION =====
class POIPositionAdmin(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    range_meter: int = Field(..., gt=0)


class POIPositionVendor(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


# ===== LOCALIZED =====
class POILocalized(BaseModel):
    name: str
    description: str


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

    name: str
    description: str
    audio_url: str | None