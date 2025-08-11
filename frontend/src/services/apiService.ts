/**
 * API Service for Backend Integration
 * Phase 1.5: Backend-Frontend Integration
 * 
 * 現在の状態: 準備済み（未使用）
 * 将来: Gemini直接呼び出しから移行予定
 */

// APIベースURL（環境変数から取得）
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * APIレスポンスの型定義
 */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserInfo {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface DanceSession {
  id: number;
  session_title: string;
  youtube_url: string;
  youtube_video_id?: string;
  video_title?: string;
  dance_genre?: string;
  difficulty_level?: string;
  overall_score?: number;
  created_at: string;
}

export interface AnalysisResult {
  id: number;
  score: number;
  good_points: string[];
  improvement_areas: string[];
  specific_advice: string[];
  video_timestamp: number;
  analysis_timestamp: string;
}

/**
 * APIサービスクラス
 * バックエンドAPIとの通信を管理
 */
export class ApiService {
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // ローカルストレージからトークンを復元
    this.token = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  /**
   * HTTPリクエストのヘルパーメソッド
   */
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const headers = {
      ...options.headers,
      'Authorization': this.token ? `Bearer ${this.token}` : '',
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    // トークンの有効期限切れ処理
    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      // リトライ
      return fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          ...headers,
          'Authorization': `Bearer ${this.token}`,
        },
      });
    }

    return response;
  }

  /**
   * 認証関連のメソッド
   */
  
  // ユーザー登録
  async register(email: string, username: string, password: string, fullName?: string): Promise<UserInfo> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        username,
        password,
        full_name: fullName,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
  }

  // ログイン
  async login(username: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const tokens = await response.json();
    this.token = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    
    // トークンをローカルストレージに保存
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    
    return tokens;
  }

  // トークンリフレッシュ
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });

    if (!response.ok) {
      // リフレッシュ失敗時はログアウト
      this.logout();
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json();
    this.token = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
  }

  // ログアウト
  logout(): void {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // 現在のユーザー情報取得
  async getCurrentUser(): Promise<UserInfo> {
    const response = await this.fetchWithAuth('/api/v1/auth/me');
    
    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  /**
   * 分析関連のメソッド
   */

  // ダンスセッション作成
  async createSession(sessionData: {
    session_title: string;
    youtube_url: string;
    youtube_video_id?: string;
    video_title?: string;
    dance_genre?: string;
    difficulty_level?: string;
  }): Promise<DanceSession> {
    const response = await this.fetchWithAuth('/api/v1/analysis/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create session');
    }

    return response.json();
  }

  // セッション一覧取得
  async getSessions(skip = 0, limit = 10): Promise<DanceSession[]> {
    const response = await this.fetchWithAuth(
      `/api/v1/analysis/sessions?skip=${skip}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error('Failed to get sessions');
    }

    return response.json();
  }

  // 動作分析実行（バックエンド経由）
  async analyzeMovement(
    sessionId: number,
    videoTimestamp: number,
    webcamFrame: string,
    poseKeypoints?: any
  ): Promise<AnalysisResult> {
    const response = await this.fetchWithAuth('/api/v1/analysis/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        video_timestamp: videoTimestamp,
        webcam_frame: webcamFrame,
        pose_keypoints: poseKeypoints,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Analysis failed');
    }

    return response.json();
  }

  // セッションの分析履歴取得
  async getSessionAnalyses(
    sessionId: number,
    skip = 0,
    limit = 100
  ): Promise<AnalysisResult[]> {
    const response = await this.fetchWithAuth(
      `/api/v1/analysis/sessions/${sessionId}/analyses?skip=${skip}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error('Failed to get analyses');
    }

    return response.json();
  }

  // 統計情報取得
  async getStats(): Promise<{
    total_sessions: number;
    total_practice_time: number;
    average_score: number;
    improvement_rate: number;
    favorite_genre?: string;
  }> {
    const response = await this.fetchWithAuth('/api/v1/analysis/stats');

    if (!response.ok) {
      throw new Error('Failed to get stats');
    }

    return response.json();
  }

  /**
   * ユーザープロフィール関連
   */

  // プロフィール取得
  async getProfile(): Promise<any> {
    const response = await this.fetchWithAuth('/api/v1/users/profile');

    if (!response.ok) {
      throw new Error('Failed to get profile');
    }

    return response.json();
  }

  // プロフィール更新
  async updateProfile(profileData: any): Promise<any> {
    const response = await this.fetchWithAuth('/api/v1/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update profile');
    }

    return response.json();
  }

  // パスワード変更
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await this.fetchWithAuth('/api/v1/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to change password');
    }
  }
}

// シングルトンインスタンス
export const apiService = new ApiService();

/**
 * 使用例（Phase 2で実装予定）:
 * 
 * import { apiService } from './services/apiService';
 * 
 * // ログイン
 * await apiService.login('username', 'password');
 * 
 * // セッション作成
 * const session = await apiService.createSession({
 *   session_title: 'ダンス練習',
 *   youtube_url: 'https://youtube.com/watch?v=xxx'
 * });
 * 
 * // 分析実行（バックエンド経由）
 * const result = await apiService.analyzeMovement(
 *   session.id,
 *   timestamp,
 *   webcamFrame
 * );
 */