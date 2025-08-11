"""
Dance analysis API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json
import base64
import google.generativeai as genai

from app.db.session import get_db
from app.core.config import settings
from app.models.user import User
from app.models.dance_session import DanceSession
from app.models.analysis_result import AnalysisResult
from app.api.auth import get_current_user
from pydantic import BaseModel


router = APIRouter()

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)


# Pydantic models for request/response
class SessionCreate(BaseModel):
    session_title: str
    youtube_url: str
    youtube_video_id: Optional[str] = None
    video_title: Optional[str] = None
    dance_genre: Optional[str] = None
    difficulty_level: Optional[str] = "beginner"
    choreographer: Optional[str] = None
    artist: Optional[str] = None
    song_title: Optional[str] = None
    goals: Optional[List[str]] = None


class SessionResponse(BaseModel):
    id: int
    session_title: str
    youtube_url: str
    youtube_video_id: Optional[str]
    video_title: Optional[str]
    dance_genre: Optional[str]
    difficulty_level: Optional[str]
    overall_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisRequest(BaseModel):
    session_id: int
    video_timestamp: float
    webcam_frame: str  # Base64 encoded image
    pose_keypoints: Optional[dict] = None


class AnalysisResponse(BaseModel):
    id: int
    score: float
    good_points: List[str]
    improvement_areas: List[str]
    specific_advice: List[str]
    video_timestamp: float
    analysis_timestamp: datetime

    class Config:
        from_attributes = True


class SessionStats(BaseModel):
    total_sessions: int
    total_practice_time: int
    average_score: float
    improvement_rate: float
    favorite_genre: Optional[str]


# Helper functions
async def analyze_with_gemini(
    youtube_url: str,
    video_timestamp: float,
    webcam_frame: str
) -> dict:
    """Gemini APIで動画分析を実行"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Decode base64 image
        image_data = base64.b64decode(webcam_frame.split(',')[1] if ',' in webcam_frame else webcam_frame)
        
        prompt = f"""
        あなたは厳格かつ励ます姿勢を持つプロのダンスインストラクターAIです。
        
        参考動画: {youtube_url}
        現在の時点: {video_timestamp:.1f}秒
        
        提供された画像の動作を以下の基準で採点してください：
        
        【採点基準】
        0-20点: 動いていない、または全く違う動作
        21-40点: 動きはあるが、お手本とかなり異なる
        41-60点: 基本的な動きは捉えているが、改善が必要
        61-80点: 良いパフォーマンス、細部の調整が必要
        81-100点: 優秀〜完璧なパフォーマンス
        
        【回答形式】
        スコア: [0-100の整数]
        
        良い点:
        - [最大15文字で1つ]
        
        改善点:
        - [最大15文字で1つ]
        
        具体的なアドバイス:
        - [最大20文字で1つ]
        """
        
        response = model.generate_content([prompt, image_data])
        
        # Parse response
        text = response.text
        lines = text.split('\n')
        
        score = 70  # Default score
        good_points = []
        improvement_areas = []
        specific_advice = []
        
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if 'スコア:' in line:
                try:
                    score_text = line.split(':')[1].strip()
                    # Extract number from text (handle both "85" and "85点" formats)
                    import re
                    score_match = re.search(r'\d+', score_text)
                    if score_match:
                        score = float(score_match.group())
                except:
                    pass
            elif '良い点:' in line:
                current_section = 'good'
            elif '改善点:' in line:
                current_section = 'improve'
            elif '具体的なアドバイス:' in line or 'アドバイス:' in line:
                current_section = 'advice'
            elif line.startswith('- ') or line.startswith('・'):
                # Remove bullet point markers
                point = line.lstrip('- ・').strip()
                if current_section == 'good' and point:
                    good_points.append(point[:15])  # Limit to 15 chars
                elif current_section == 'improve' and point:
                    improvement_areas.append(point[:15])  # Limit to 15 chars
                elif current_section == 'advice' and point:
                    specific_advice.append(point[:20])  # Limit to 20 chars
        
        return {
            "score": score,
            "good_points": good_points,
            "improvement_areas": improvement_areas,
            "specific_advice": specific_advice,
            "raw_feedback": text
        }
    
    except Exception as e:
        print(f"Gemini API error: {e}")
        return {
            "score": 50,
            "good_points": ["動いてる！"],
            "improvement_areas": ["もっと大きく"],
            "specific_advice": ["リズムを意識"],
            "raw_feedback": f"Analysis error: {str(e)}"
        }


# API Endpoints
@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """新しいダンスセッションを作成"""
    new_session = DanceSession(
        user_id=current_user.id,
        session_title=session_data.session_title,
        youtube_url=session_data.youtube_url,
        youtube_video_id=session_data.youtube_video_id,
        video_title=session_data.video_title,
        dance_genre=session_data.dance_genre,
        difficulty_level=session_data.difficulty_level,
        choreographer=session_data.choreographer,
        artist=session_data.artist,
        song_title=session_data.song_title,
        goals=json.dumps(session_data.goals) if session_data.goals else None,
        start_time=datetime.utcnow()
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return new_session


@router.get("/sessions", response_model=List[SessionResponse])
async def get_sessions(
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ユーザーのダンスセッション一覧を取得"""
    sessions = db.query(DanceSession).filter(
        DanceSession.user_id == current_user.id
    ).order_by(DanceSession.created_at.desc()).offset(skip).limit(limit).all()
    
    return sessions


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """特定のダンスセッションを取得"""
    session = db.query(DanceSession).filter(
        DanceSession.id == session_id,
        DanceSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return session


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_dance(
    analysis_data: AnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ダンスパフォーマンスを分析"""
    # Verify session exists and belongs to user
    session = db.query(DanceSession).filter(
        DanceSession.id == analysis_data.session_id,
        DanceSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Perform analysis with Gemini
    analysis_result = await analyze_with_gemini(
        session.youtube_url,
        analysis_data.video_timestamp,
        analysis_data.webcam_frame
    )
    
    # Save analysis result
    new_analysis = AnalysisResult(
        user_id=current_user.id,
        dance_session_id=session.id,
        video_timestamp=analysis_data.video_timestamp,
        score=analysis_result["score"],
        good_points=analysis_result["good_points"],
        improvement_areas=analysis_result["improvement_areas"],
        specific_advice=analysis_result["specific_advice"],
        raw_feedback=analysis_result["raw_feedback"],
        pose_keypoints=analysis_data.pose_keypoints
    )
    
    db.add(new_analysis)
    
    # Update session scores
    all_analyses = db.query(AnalysisResult).filter(
        AnalysisResult.dance_session_id == session.id
    ).all()
    
    if all_analyses:
        scores = [a.score for a in all_analyses]
        session.overall_score = sum(scores) / len(scores)
        session.best_score = max(scores)
        
        # Calculate improvement rate if we have enough data
        if len(scores) >= 3:
            early_scores = scores[:len(scores)//3]
            late_scores = scores[-len(scores)//3:]
            early_avg = sum(early_scores) / len(early_scores)
            late_avg = sum(late_scores) / len(late_scores)
            session.improvement_rate = ((late_avg - early_avg) / early_avg) * 100 if early_avg > 0 else 0
    
    db.commit()
    db.refresh(new_analysis)
    
    return new_analysis


@router.get("/sessions/{session_id}/analyses", response_model=List[AnalysisResponse])
async def get_session_analyses(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """セッションの全分析結果を取得"""
    # Verify session belongs to user
    session = db.query(DanceSession).filter(
        DanceSession.id == session_id,
        DanceSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    analyses = db.query(AnalysisResult).filter(
        AnalysisResult.dance_session_id == session_id
    ).order_by(AnalysisResult.video_timestamp).all()
    
    return analyses


@router.get("/stats", response_model=SessionStats)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ユーザーの統計情報を取得"""
    sessions = db.query(DanceSession).filter(
        DanceSession.user_id == current_user.id
    ).all()
    
    total_sessions = len(sessions)
    total_practice_time = sum(s.practice_duration or 0 for s in sessions)
    
    all_scores = []
    genre_counts = {}
    
    for session in sessions:
        if session.overall_score:
            all_scores.append(session.overall_score)
        if session.dance_genre:
            genre_counts[session.dance_genre] = genre_counts.get(session.dance_genre, 0) + 1
    
    average_score = sum(all_scores) / len(all_scores) if all_scores else 0
    
    # Calculate average improvement rate
    improvement_rates = [s.improvement_rate for s in sessions if s.improvement_rate is not None]
    avg_improvement = sum(improvement_rates) / len(improvement_rates) if improvement_rates else 0
    
    # Find favorite genre
    favorite_genre = max(genre_counts, key=genre_counts.get) if genre_counts else None
    
    return SessionStats(
        total_sessions=total_sessions,
        total_practice_time=total_practice_time,
        average_score=average_score,
        improvement_rate=avg_improvement,
        favorite_genre=favorite_genre
    )