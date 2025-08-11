"""
Dance Motion Analyzer Backend
FastAPI-based backend service for secure API management and data persistence
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api import auth, analysis, users
from app.core.config import settings

# ロギング設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # 起動時
    logger.info("Starting Dance Motion Analyzer Backend...")
    yield
    # 終了時
    logger.info("Shutting down...")

# FastAPIアプリケーション作成
app = FastAPI(
    title="Dance Motion Analyzer API",
    description="Backend API for Dance Motion Analyzer",
    version="1.0.0",
    lifespan=lifespan
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["Analysis"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])

@app.get("/")
async def root():
    """ヘルスチェックエンドポイント"""
    return {
        "status": "healthy",
        "service": "Dance Motion Analyzer Backend",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """詳細なヘルスチェック"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: 実際のDB接続チェック
        "cache": "connected",     # TODO: Redis接続チェック
        "gemini_api": "available" # TODO: Gemini API接続チェック
    }
