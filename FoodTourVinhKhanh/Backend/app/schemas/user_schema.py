from pydantic import BaseModel, EmailStr
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