"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ThemeProvider() {
  const pathname = usePathname();

  useEffect(() => {
    let theme = "";

    if (pathname === "/home-2") theme = "two";
    else if (pathname === "/home-3") theme = "three";
    else if (pathname === "/home-4") theme = "four";
    else if (pathname === "/home-5") theme = "five";

    // Set data-theme on <html>
    document.documentElement.setAttribute("data-theme", theme);

    // Optional cleanup on unmount
    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, [pathname]);

  return null;
}