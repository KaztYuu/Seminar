from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis

from app.routes.auth_router import router as auth_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/")
def home():
    return {"message": "Food Tour Vinh Khanh API running"}