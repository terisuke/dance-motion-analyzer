"""
Application configuration using Pydantic Settings
"""

from pydantic_settings import BaseSettings
from typing import List
import secrets

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Dance Motion Analyzer"
    DEBUG: bool = False
    
    # API Keys
    GEMINI_API_KEY: str
    
    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/dance_analyzer"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://dance-analyzer.vercel.app"
    ]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    ANALYSIS_RATE_LIMIT_PER_MINUTE: int = 10
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
