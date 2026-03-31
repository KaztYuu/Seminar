from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.middlewares.session_middleware import session_middleware

from app.routes.auth_router import router as auth_router
from app.routes.package_router import router as package_router
from app.routes.payment_router import router as payment_router
from app.routes.user_router import router as user_router
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(session_middleware)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router)
app.include_router(package_router)
app.include_router(payment_router)
app.include_router(user_router)


@app.get("/")
def home():
    return {"message": "Food Tour Vinh Khanh API running"}