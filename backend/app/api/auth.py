"""
Authentication endpoints.

POST /api/auth/login — demo login for POC.
Replace with Azure AD / Entra ID SSO in production.
"""

from fastapi import APIRouter, HTTPException
from app.config import get_settings
from app.models.auth import LoginRequest, LoginResponse, UserInfo

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    """
    Authenticate a user with email + password.

    POC: validates against .env credentials.
    Production: replace with Azure AD / Entra ID token validation.
    """
    settings = get_settings()

    if body.email == settings.demo_email and body.password == settings.demo_password:
        return LoginResponse(
            success=True,
            token="demo-token-poc",
            user=UserInfo(
                name="Marcus Schmidt",
                role="C1 Europe Sales Executive",
                territory="C1 Europe",
            ),
        )

    raise HTTPException(
        status_code=401,
        detail="Invalid Username & Password",
    )
