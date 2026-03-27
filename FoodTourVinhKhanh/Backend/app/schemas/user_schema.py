from pydantic import BaseModel, EmailStr, field_validator
from enum import Enum

class UserRole(str, Enum):
    tourist = "tourist"
    vendor = "vendor"


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.tourist


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserLogout(BaseModel):
    id: int

class UpdateProfileRequest(BaseModel):
    name: str

    @field_validator("name")
    def validate_name(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Tên không được rỗng")
        return v
    
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str