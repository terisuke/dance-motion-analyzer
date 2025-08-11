"""
User management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from app.db.session import get_db
from app.models.user import User
from app.models.dance_session import DanceSession
from app.api.auth import get_current_user, get_password_hash, verify_password
from pydantic import BaseModel, EmailStr


router = APIRouter()


# Pydantic models for request/response
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    dance_level: Optional[str] = None
    preferred_genres: Optional[List[str]] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserProfile(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    bio: Optional[str]
    profile_image_url: Optional[str]
    dance_level: Optional[str]
    preferred_genres: Optional[List[str]]
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime]
    
    # Statistics
    total_sessions: Optional[int] = 0
    total_practice_hours: Optional[float] = 0
    average_score: Optional[float] = 0

    class Config:
        from_attributes = True


class PublicUserProfile(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    bio: Optional[str]
    profile_image_url: Optional[str]
    dance_level: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# API Endpoints
@router.get("/profile", response_model=UserProfile)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """現在のユーザーのプロフィールを取得"""
    # Calculate statistics
    sessions = db.query(DanceSession).filter(
        DanceSession.user_id == current_user.id
    ).all()
    
    total_sessions = len(sessions)
    total_practice_seconds = sum(s.practice_duration or 0 for s in sessions)
    total_practice_hours = total_practice_seconds / 3600 if total_practice_seconds else 0
    
    scores = [s.overall_score for s in sessions if s.overall_score is not None]
    average_score = sum(scores) / len(scores) if scores else 0
    
    # Parse preferred genres
    preferred_genres = json.loads(current_user.preferred_genres) if current_user.preferred_genres else []
    
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        bio=current_user.bio,
        profile_image_url=current_user.profile_image_url,
        dance_level=current_user.dance_level,
        preferred_genres=preferred_genres,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at,
        total_sessions=total_sessions,
        total_practice_hours=round(total_practice_hours, 2),
        average_score=round(average_score, 1)
    )


@router.put("/profile", response_model=UserProfile)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ユーザープロフィールを更新"""
    # Update user fields if provided
    if user_update.email is not None:
        # Check if email is already taken
        existing_user = db.query(User).filter(
            User.email == user_update.email,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = user_update.email
    
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    
    if user_update.bio is not None:
        current_user.bio = user_update.bio
    
    if user_update.profile_image_url is not None:
        current_user.profile_image_url = user_update.profile_image_url
    
    if user_update.dance_level is not None:
        if user_update.dance_level not in ["beginner", "intermediate", "advanced"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid dance level. Must be beginner, intermediate, or advanced"
            )
        current_user.dance_level = user_update.dance_level
    
    if user_update.preferred_genres is not None:
        current_user.preferred_genres = json.dumps(user_update.preferred_genres)
    
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(current_user)
    
    # Return updated profile with statistics
    return await get_profile(current_user, db)


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """パスワードを変更"""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Password updated successfully"}


@router.get("/{user_id}", response_model=PublicUserProfile)
async def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db)
):
    """公開ユーザープロフィールを取得"""
    user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.get("/", response_model=List[PublicUserProfile])
async def list_users(
    skip: int = 0,
    limit: int = 20,
    dance_level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """ユーザー一覧を取得（公開プロフィールのみ）"""
    query = db.query(User).filter(User.is_active == True)
    
    if dance_level:
        query = query.filter(User.dance_level == dance_level)
    
    users = query.offset(skip).limit(limit).all()
    
    return users


@router.delete("/account")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """アカウントを削除（論理削除）"""
    # Soft delete - just mark as inactive
    current_user.is_active = False
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Account deactivated successfully"}


@router.post("/account/reactivate")
async def reactivate_account(
    username: str,
    password: str,
    db: Session = Depends(get_db)
):
    """アカウントを再有効化"""
    user = db.query(User).filter(User.username == username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    if user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already active"
        )
    
    user.is_active = True
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Account reactivated successfully"}