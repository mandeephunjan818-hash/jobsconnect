"use client";

import { useEffect, useRef } from 'react';

export function useJarallax(speed: number = 0.6) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let jarallaxInstance: any = null;

    const initJarallax = async () => {
      try {
        const { jarallax } = await import('jarallax');
        if (elementRef.current) {
          jarallax(elementRef.current, { speed });
          jarallaxInstance = jarallax;
        }
      } catch (error) {
        console.error('Error initializing jarallax:', error);
      }
    };

    initJarallax();

    return () => {
      const cleanup = async () => {
        try {
          if (jarallaxInstance && elementRef.current) {
            const { jarallax } = await import('jarallax');
            jarallax(elementRef.current, 'destroy');
          }
        } catch (error) {
          console.error('Error cleaning up jarallax:', error);
        }
      };
      cleanup();
    };
  }, [speed]);

  return elementRef;
}