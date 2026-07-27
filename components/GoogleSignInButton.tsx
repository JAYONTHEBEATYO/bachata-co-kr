"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    context?: "signin" | "signup" | "use";
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "continue_with";
      shape: "rectangular";
      logo_alignment: "left";
      width: number;
      locale: "ko";
    }
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

export default function GoogleSignInButton({
  clientId,
  returnTo
}: {
  clientId: string;
  returnTo: string;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const buttonWidthRef = useRef(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const submitCredential = useCallback(async (response: GoogleCredentialResponse) => {
    if (!response.credential) {
      setStatus("error");
      setError("Google 계정 정보를 받지 못했습니다. 다시 시도해주세요.");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const loginResponse = await fetch("/api/auth/google/credential", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          credential: response.credential,
          returnTo
        })
      });
      const result = await loginResponse.json() as {
        error?: string;
        redirectTo?: string;
      };
      if (!loginResponse.ok || !result.redirectTo) {
        throw new Error(result.error || "로그인에 실패했습니다.");
      }
      window.location.assign(result.redirectTo);
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "로그인에 실패했습니다.");
    }
  }, [returnTo]);

  const renderGoogleButton = useCallback(() => {
    const googleId = window.google?.accounts.id;
    const container = buttonRef.current;
    if (!googleId || !container || !clientId) return;

    container.replaceChildren();
    googleId.initialize({
      client_id: clientId,
      callback: submitCredential,
      context: "signup"
    });
    googleId.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: Math.min(400, Math.max(200, Math.floor(container.getBoundingClientRect().width))),
      locale: "ko"
    });
    buttonWidthRef.current = Math.min(400, Math.max(200, Math.floor(container.getBoundingClientRect().width)));
  }, [clientId, submitCredential]);

  useEffect(() => {
    if (window.google?.accounts.id) renderGoogleButton();
  }, [renderGoogleButton]);

  useEffect(() => {
    const container = buttonRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.min(400, Math.max(200, Math.floor(entry.contentRect.width)));
      if (nextWidth !== buttonWidthRef.current && window.google?.accounts.id) {
        renderGoogleButton();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [renderGoogleButton]);

  if (!clientId) {
    return (
      <p className="auth-error">
        Google 로그인 설정을 마무리하는 중입니다. 잠시 후 다시 시도해주세요.
      </p>
    );
  }

  return (
    <div className="google-signin-wrap" aria-busy={status === "loading"}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={renderGoogleButton}
      />
      <div className="google-signin-slot" ref={buttonRef} />
      {status === "loading" ? <p className="auth-status">계정을 연결하고 있습니다.</p> : null}
      {status === "error" ? <p className="auth-error">{error}</p> : null}
    </div>
  );
}
