"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const visitorKey = "bachata.analytics.visitor";
const sessionKey = "bachata.analytics.session";

const randomId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const storedId = (storage: Storage, key: string) => {
  const current = storage.getItem(key);
  if (current && /^[a-zA-Z0-9_-]{12,100}$/.test(current)) return current;
  const next = randomId();
  storage.setItem(key, next);
  return next;
};

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    if (navigator.doNotTrack === "1") return;

    const visitorId = storedId(window.localStorage, visitorKey);
    const sessionId = storedId(window.sessionStorage, sessionKey);
    const eventId = randomId();
    const startedAt = Date.now();
    let maxScroll = 0;
    let sent = false;

    const updateScroll = () => {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      maxScroll = Math.max(maxScroll, Math.min(100, Math.round((window.scrollY / scrollable) * 100)));
    };

    const finish = () => {
      if (sent) return;
      sent = true;
      updateScroll();
      const body = JSON.stringify({
        action: "end",
        eventId,
        duration: Math.round((Date.now() - startedAt) / 1000),
        maxScroll
      });
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
    };

    fetch("/api/analytics", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "start",
        eventId,
        visitorId,
        sessionId,
        path: pathname,
        referrer: document.referrer
      }),
      keepalive: true
    }).catch(() => undefined);

    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("pagehide", finish);
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("pagehide", finish);
      finish();
    };
  }, [pathname]);

  return null;
}
