'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AOS from 'aos';
import 'aos/dist/aos.css'; // Ensure the AOS CSS is imported here!

export default function AOSInit() {
    const pathname = usePathname();

    // 1. Initialize AOS only once when the app first mounts
    useEffect(() => {
        AOS.init({
            once: true,      // Animation happens only once while scrolling down
            duration: 800,   // Animation duration in ms
            easing: 'ease-out-cubic',
            offset: 50,      // Offset (in px) from the original trigger point
        });
    }, []);

    // 2. Refresh AOS on route changes AND on initial hard reload
    useEffect(() => {
        const refreshAOS = () => {
            // A small timeout ensures Next.js has finished rendering the new DOM 
            // and any lazy-loaded images have had a chance to affect the layout
            const timer = setTimeout(() => {
                AOS.refresh();
            }, 150);
            return timer;
        };

        // Trigger refresh when the route changes (Client-side navigation)
        const timer = refreshAOS();

        // 🌟 THE MAGIC FIX FOR HARD RELOADS 🌟
        // Listen to the window 'load' event. This fires ONLY when ALL assets 
        // (images, fonts, iframes) are completely finished loading.
        const handleWindowLoad = () => {
            AOS.refresh();
        };

        if (document.readyState === 'complete') {
            // If the page is already fully loaded (e.g., client-side navigation), refresh immediately
            handleWindowLoad();
        } else {
            // If the page is still loading (hard reload), wait for the 'load' event
            window.addEventListener('load', handleWindowLoad);
        }

        // Cleanup
        return () => {
            clearTimeout(timer);
            window.removeEventListener('load', handleWindowLoad);
        };
    }, [pathname]); // Re-runs every time the Next.js URL path changes

    return null; // This component renders nothing visually
}