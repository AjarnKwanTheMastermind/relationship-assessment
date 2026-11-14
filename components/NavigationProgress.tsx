"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A thin bar across the top of the page while the next page loads, so a click on a menu, a tab or a filter never
// feels dead. It starts on a click on a link to another page of this site, on a GET form (the date filters) and
// on the "nav-start" event (the quiz sends it before it opens the result). It finishes when the address changes.
// Nothing is stored and nothing is sent anywhere.
export default function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [state, setState] = useState<"idle" | "run" | "done">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const finish = useCallback(() => {
    clearTimers();
    setState("done");
    timers.current.push(setTimeout(() => setState("idle"), 600));
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setState("run");
    // If the page never arrives, do not leave the bar hanging.
    timers.current.push(setTimeout(finish, 20000));
  }, [finish]);

  // The address changed: the new page is here.
  useEffect(() => {
    setState((s) => {
      if (s !== "run") return s;
      return "done";
    });
    clearTimers();
    timers.current.push(setTimeout(() => setState("idle"), 600));
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // The same page, or only a #anchor: nothing to load.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    const onSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (form?.method?.toLowerCase() === "get") start();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setState("idle");
    };
    // Capture phase, so it runs before a link or form handler can stop the event.
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("nav-start", start);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("nav-start", start);
      window.removeEventListener("pageshow", onPageShow);
      clearTimers();
    };
  }, [start]);

  return (
    <div
      aria-hidden="true"
      className={`nav-progress ${state === "run" ? "nav-progress-run" : state === "done" ? "nav-progress-done" : ""}`}
    />
  );
}
