from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from fastapi import APIRouter
from dotenv import load_dotenv
import os

load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
ALGORITHM = os.getenv("ALGORITHM")
SECRET_KEY = os.getenv("SECRET_KEY")


def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        print(f"DEBUG: Received token: {token}", flush=True)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"DEBUG: Decoded payload: {payload}", flush=True)
        username: str = payload.get("sub")
        if username is None:
            print("DEBUG: sub (username) is None in payload", flush=True)
            raise credentials_exception

    except JWTError as e:
        print(f"DEBUG: JWTError during decode: {e}", flush=True)
        raise credentials_exception
    except Exception as e:
        print(f"DEBUG: Unexpected error during decode: {type(e)} - {e}", flush=True)
        raise credentials_exception

    return username


protected_router = APIRouter()
