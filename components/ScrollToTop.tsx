"use client";

import { useEffect } from "react";

// Put next to an error message. When it appears (or the page is shown again with the message), the page scrolls
// to the top so the message is seen, instead of staying at the button that was pressed. The jump is instant:
// it needs no animation, which also suits people who asked their system for less motion.
export default function ScrollToTop() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return null;
}
