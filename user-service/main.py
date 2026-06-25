from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Header, HTTPException, status
from app.utils.jwt_handler import verify_token
from app.routers.user_router import router as user_public_router
from app.routers.user_router import protected_router as user_protected_router
from app.database.connection import lifespan

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
        "http://localhost:8002",
        "http://127.0.0.1:8002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_public_router, prefix="/auth", tags=["Auth"])
app.include_router(user_protected_router, prefix="/user", tags=["profile"])


@app.get("/")
def message():
    return {"message": "Welcome to Campus Event Hub Server - V2!"}


@app.get("/auth/verify")
async def auth_verify(authorization: str = Header(...)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing or invalid",
        )

    token = authorization.split(" ")[1]
    payload = verify_token(token)
    if payload == "Invalid Token":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token validation failed"
        )
    else:
        return {"status": "authenticated"}


@app.get("/health")
def health():
    return {"message": "User Service is healthy"}
