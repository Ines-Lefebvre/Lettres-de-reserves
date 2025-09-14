import React, { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

interface LazyVideoProps {
  className?: string;
  posterUrl?: string;
  mobileVideoUrl?: string;
  desktopVideoUrl?: string;
  ariaLabel?: string;
}

const LazyVideo: React.FC<LazyVideoProps> = ({
  className = "",
  posterUrl = "/posters/lawyer-video-poster.jpg",
  mobileVideoUrl = "/lawyer-video-720.mp4",
  desktopVideoUrl = "/lawyer-video-1080.mp4",
  ariaLabel = "Lire la vidéo de présentation"
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [hasUserPlayed, setHasUserPlayed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Décisions d'autoplay en fonction de l'environnement
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Autoplay autorisé seulement si desktop + pas de reduce motion
    setShouldAutoplay(!isMobile && !reduceMotion);
  }, []);

  // Lazy: ne marque visible que quand dans le viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect(); // Stop observing once visible
        }
      },
      { 
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.1 
      }
    );
    
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Si visible + autoplay autorisé, lancer la lecture automatiquement
  useEffect(() => {
    if (!visible || !shouldAutoplay) return;
    const v = videoRef.current;
    if (!v) return;
    
    // Pour que l'autoplay passe sur Chrome/Safari: muted + playsInline
    v.muted = true;
    v.playsInline = true;
    
    // Attendre que la vidéo soit prête
    const handleCanPlay = () => {
      setIsLoading(false);
      // Tenter la lecture (promesse ignorée en cas de blocage)
      v.play().catch(() => {
        // Si l'autoplay échoue, afficher le bouton
        console.log('Autoplay bloqué par le navigateur');
      });
    };

    if (v.readyState >= 3) {
      // Vidéo déjà prête
      handleCanPlay();
    } else {
      // Attendre que la vidéo soit prête
      setIsLoading(true);
      v.addEventListener('canplay', handleCanPlay, { once: true });
    }

    return () => {
      v.removeEventListener('canplay', handleCanPlay);
    };
  }, [visible, shouldAutoplay]);

  const onUserPlay = () => {
    setHasUserPlayed(true);
    const v = videoRef.current;
    if (!v) return;
    
    // L'utilisateur a cliqué, on peut activer le son
    v.muted = false;
    v.play().catch(() => {
      console.log('Lecture manuelle échouée');
    });
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
  };

  // Afficher le bouton si:
  // - mobile (shouldAutoplay = false) OU
  // - prefers-reduced-motion OU
  // - l'utilisateur n'a pas encore décidé de lire
  const showPlayButton = (!shouldAutoplay) && visible && !hasUserPlayed;

  return (
    <div ref={ref} className={`relative w-full max-w-4xl mx-auto ${className}`}>
      {/* Play Button Overlay - seulement sur mobile ou reduced motion */}
      {showPlayButton && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <button
            className="bg-brand-accent hover:bg-opacity-90 text-white px-6 py-3 rounded-xl shadow-xl font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-brand-accent focus:ring-opacity-50"
            aria-label={ariaLabel}
            onClick={onUserPlay}
          >
            <Play className="w-5 h-5" />
            Lire la vidéo
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && shouldAutoplay && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50 rounded-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Poster Image (shown when video not loaded) */}
      {!visible && (
        <div className="w-full aspect-video bg-gray-200 rounded-xl flex items-center justify-center">
          <div className="text-gray-500 text-center">
            <Play className="w-16 h-16 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Vidéo en cours de chargement...</p>
          </div>
        </div>
      )}

      {/* Video Element */}
      {visible && (
        <video
          ref={videoRef}
          className="w-full aspect-video rounded-xl shadow-lg"
          // autoplay si shouldAutoplay true (desktop sans reduce-motion)
          {...(shouldAutoplay ? { autoPlay: true } : {})}
          // requis pour autoplay sur browsers modernes
          muted={shouldAutoplay} // muted seulement pour autoplay
          playsInline
          loop
          controls
          preload="metadata"
          poster={posterUrl}
          onLoadedData={handleVideoLoad}
          onError={() => setIsLoading(false)}
          onPlay={() => setHasUserPlayed(true)}
        >
          {/* Mobile version (720p) */}
          <source 
            src={mobileVideoUrl} 
            type="video/mp4" 
            media="(max-width: 768px)" 
          />
          {/* Desktop version (1080p) */}
          <source 
            src={desktopVideoUrl} 
            type="video/mp4" 
            media="(min-width: 769px)" 
          />
          {/* Fallback */}
          <source src={mobileVideoUrl} type="video/mp4" />
          
          <p className="text-center text-gray-600 p-4">
            Votre navigateur ne supporte pas la vidéo HTML5.
            <a href={mobileVideoUrl} className="text-brand-accent hover:underline ml-2">
              Télécharger la vidéo
            </a>
          </p>
        </video>
      )}
    </div>
  );
};

export default LazyVideo;