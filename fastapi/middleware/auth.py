import os

import jwt
from fastapi import Header, HTTPException

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"


def verify_jwt(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")

    token = authorization.removeprefix("Bearer ")

    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")

    return token
