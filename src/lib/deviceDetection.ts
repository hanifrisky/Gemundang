'use client';

import { useState, useEffect } from 'react';

export interface DeviceProfile {
  isMobile: boolean;      // Smartphone (iOS, Android phone, etc.)
  isTablet: boolean;      // Tablet (iPad, Android tablet, etc.)
  isDesktop: boolean;     // Laptop / Desktop PC
  isTouchDevice: boolean; // Memiliki layar sentuh (touchscreen)
  defaultOrientation: 'portrait' | 'landscape';
  defaultShowControls: boolean;
}

const MOBILE_REGEX = /Android.*Mobile|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
const TABLET_REGEX = /iPad|Android(?!.*Mobile)|Tablet/i;

export function getDeviceProfile(): DeviceProfile {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouchDevice: false,
      defaultOrientation: 'landscape',
      defaultShowControls: false
    };
  }

  const userAgent = navigator.userAgent || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const hasCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const isTouchDevice = maxTouchPoints > 0 || hasCoarsePointer;

  const uaIsMobile = MOBILE_REGEX.test(userAgent);
  const uaIsTablet = TABLET_REGEX.test(userAgent);

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isPhysicallyPortrait = screenHeight > screenWidth;

  // Klasifikasi perangkat
  let isMobile = false;
  let isTablet = false;
  let isDesktop = false;

  if (uaIsMobile || (isTouchDevice && screenWidth < 768)) {
    isMobile = true;
  } else if (uaIsTablet || (isTouchDevice && screenWidth >= 768 && screenWidth <= 1200)) {
    isTablet = true;
  } else {
    isDesktop = true;
  }

  // Tentukan default orientasi dan status tombol virtual
  let defaultOrientation: 'portrait' | 'landscape' = 'landscape';
  let defaultShowControls = false;

  if (isMobile) {
    // Smartphone selalu default potrait & tombol virtual otomatis terbuka
    defaultOrientation = 'portrait';
    defaultShowControls = true;
  } else if (isTablet) {
    // Tablet mengikuti orientasi fisik
    if (isPhysicallyPortrait) {
      defaultOrientation = 'portrait';
      defaultShowControls = true;
    } else {
      defaultOrientation = 'landscape';
      defaultShowControls = false;
    }
  } else {
    // Desktop / Laptop: default landscape & tombol virtual default tertutup
    defaultOrientation = 'landscape';
    defaultShowControls = false;
  }

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    defaultOrientation,
    defaultShowControls
  };
}

export function useDeviceProfile() {
  const [profile, setProfile] = useState<DeviceProfile>(() => {
    // Default safe profile for SSR / initial render
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouchDevice: false,
      defaultOrientation: 'landscape',
      defaultShowControls: false
    };
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const updateProfile = () => {
      setProfile(getDeviceProfile());
      setIsLoaded(true);
    };

    updateProfile();

    window.addEventListener('resize', updateProfile);
    window.addEventListener('orientationchange', updateProfile);

    let orientationMediaQuery: MediaQueryList | null = null;
    if (window.matchMedia) {
      orientationMediaQuery = window.matchMedia('(orientation: portrait)');
      const handleOrientationChange = () => updateProfile();
      orientationMediaQuery.addEventListener?.('change', handleOrientationChange);
      return () => {
        window.removeEventListener('resize', updateProfile);
        window.removeEventListener('orientationchange', updateProfile);
        orientationMediaQuery?.removeEventListener?.('change', handleOrientationChange);
      };
    }

    return () => {
      window.removeEventListener('resize', updateProfile);
      window.removeEventListener('orientationchange', updateProfile);
    };
  }, []);

  return { profile, isLoaded };
}
