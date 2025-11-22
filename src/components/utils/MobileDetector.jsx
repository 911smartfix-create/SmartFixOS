/**
 * Hook para detectar dispositivos móviles y ajustar UI
 */
import { useState, useEffect } from 'react';

export function useMobileDetect() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });
      setIsMobile(width < 768); // < 768px = móvil
      setIsTablet(width >= 768 && width < 1024); // 768-1024px = tablet
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    screenSize,
    isPortrait: screenSize.height > screenSize.width,
    isLandscape: screenSize.width > screenSize.height
  };
}

// Helper para clases condicionales móvil
export function mobileClass(mobileClasses, desktopClasses = '') {
  if (typeof window === 'undefined') return desktopClasses;
  return window.innerWidth < 768 ? mobileClasses : desktopClasses;
}

// Detectar si es iOS
export function isIOS() {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Detectar si es Android
export function isAndroid() {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export default useMobileDetect;