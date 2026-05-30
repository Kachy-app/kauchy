import React from 'react';

// You might need to adjust the image path if it's different in your project structure
const LOGO_URL = "/logo.png";

export default function LoadingModal() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-black/50 backdrop-blur-[4px] animate-[fadeIn_0.5s_ease-out_forwards]"></div>
      <div className="relative z-[10000] flex items-center justify-center animate-[scaleIn_0.6s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
        <img src={LOGO_URL} alt="Loading" className="w-[150px] h-[150px] object-contain animate-pulse" />
      </div>
    </div>
  );
}
