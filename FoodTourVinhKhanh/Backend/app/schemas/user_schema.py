from pydantic import BaseModel, EmailStr, field_validator
from enum import Enum
from typing import Literal, Optional
from datetime import datetime

class UserRole(str, Enum):
    tourist = "tourist"
    vendor = "vendor"


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    phoneNumber: str
    role: UserRole = UserRole.tourist


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserLogout(BaseModel):
    id: int

class UpdateProfileRequest(BaseModel):
    name: str
    phoneNumber: str

    @field_validator("name")
    def validate_name(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Tên không được rỗng")
        return v
    
    @field_validator("phoneNumber")
    def validate_phoneNumber(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Số điện thoại không được rỗng")
        return v
    
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phoneNumber: str
    role: Literal["tourist", "vendor", "admin"]
    is_Blocked: bool = False

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    phoneNumber: Optional[str] = None
    role: Optional[Literal["tourist", "vendor", "admin"]] = None
    is_Blocked: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phoneNumber: str
    role: str
    is_Blocked: bool
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True