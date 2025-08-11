import React from 'react';
import YouTube from 'react-youtube';
import type { YouTubePlayer } from '../types';

interface YouTubePlayerWrapperProps {
  videoId: string | null;
  onReady: (player: YouTubePlayer) => void;
}

const YouTubePlayerWrapper: React.FC<YouTubePlayerWrapperProps> = ({ videoId, onReady }) => {
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      rel: 0,
      playsinline: 1,
    },
  };

  const handleReady = (event: { target: YouTubePlayer }) => {
    onReady(event.target);
  };
  
  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden">
      {videoId ? (
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={handleReady}
          className="w-full h-full"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          YouTube URLを入力して動画を設定してください
        </div>
      )}
    </div>
  );
};

export default YouTubePlayerWrapper;