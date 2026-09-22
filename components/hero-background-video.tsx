"use client";

import { useEffect, useRef } from "react";

interface HeroBackgroundVideoProps {
  cloudinaryUrl?: string;
  localUrl?: string;
}

export function HeroBackgroundVideo({
  cloudinaryUrl = "https://res.cloudinary.com/djbejmo17/video/upload/v1790051047/gemini_generated_video_dd76a7b6_cdn2fh.mp4",
  localUrl = "/hero-video.mp4",
}: HeroBackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    video.muted = true;

    const promise = video.play();
    if (promise !== undefined) {
      promise.catch(() => {
        // Fallback en caso de que el navegador requiera interacción
        video.muted = true;
        video.play().catch(() => {});
      });
    }
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none select-none">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover object-center"
      >
        <source src={localUrl} type="video/mp4" />
        <source src={cloudinaryUrl} type="video/mp4" />
      </video>

      {/* 1. Sombra suave superior para que la barra de navegación destaque */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />

      {/* 2. Velo semitransparente que protege la legibilidad del texto sin oscurecer el video */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#672d15]/90 via-black/20 to-transparent md:bg-gradient-to-r md:from-black/20 md:via-black/40 md:to-[#091a12]/90" />

      {/* 3. Transición fluida inferior hacia el fondo base #672D15 */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#672d15] to-transparent" />
    </div>
  );
}
