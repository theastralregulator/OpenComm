import { useEffect } from 'react';

export function useVisualViewport() {
  useEffect(() => {
    const handleResize = () => {
      // Get the visual viewport height, fallback to window.innerHeight if not supported
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      
      // Calculate 1vh based on the *actual* available height
      const vh = viewportHeight * 0.01;
      
      // Set the CSS variable on the document root
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Also expose the raw height and keyboard height estimation
      document.documentElement.style.setProperty('--viewport-height', `${viewportHeight}px`);
      
      // Estimate if keyboard is open based on height difference from window.screen.height
      // Note: This is an approximation as screen.height includes OS bars, 
      // but a significant drop in visualViewport indicates keyboard.
      if (window.visualViewport && window.visualViewport.height < window.innerHeight * 0.8) {
        document.documentElement.classList.add('keyboard-open');
      } else {
        document.documentElement.classList.remove('keyboard-open');
      }
    };

    // Run initially
    handleResize();

    // Listen to visual viewport changes (smooth resize when keyboard animates)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize); // Fix for iOS scrolling
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);
}
