 
'use client';
import { useEffect, useState } from "react";

interface StickyState {
  sticky: boolean;
}

const useSticky = (): StickyState => {
  const [sticky, setSticky] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);  
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    const stickyHeader = () => {
      setSticky(window.scrollY > 200);
    };

    window.addEventListener("scroll", stickyHeader);
    stickyHeader(); // Initialize on mount

    return () => {
      window.removeEventListener("scroll", stickyHeader);
    };
  }, [hasMounted]);

  return { sticky };
};

export default useSticky;
