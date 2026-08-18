"""
Pydantic models for authentication endpoints.
"""

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Expected body for POST /api/auth/login."""
    email: str
    password: str


class UserInfo(BaseModel):
    """User profile returned on successful login."""
    name: str
    role: str
    territory: str


class LoginResponse(BaseModel):
    """Response body for POST /api/auth/login."""
    success: bool
    token: str | None = None
    user: UserInfo | None = None
    error: str | None = None
