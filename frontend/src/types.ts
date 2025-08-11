export interface ParsedFeedback {
  score: number | null;
  goodPoint: string;
  improvementPoint: string;
  advice: string;
  raw: string;
}

export interface WebcamViewHandles {
  captureFrame: () => string | null;
}

export type Theme = 'light' | 'dark';

// This type is needed for the react-youtube library
export interface YouTubePlayer {
  getCurrentTime: () => number;
  getPlayerState: () => number;
}
