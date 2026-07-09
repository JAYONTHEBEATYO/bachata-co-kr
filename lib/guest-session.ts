"use client";

import { needsNicknameRefresh, randomKoreanNickname } from "./nicknames";

export type GuestSession = {
  nickname: string;
  password: string;
};

const storageKey = "bachata.guestSession.v1";

const randomPassword = () => String(Math.floor(1000 + Math.random() * 9000));

const readStoredSession = (): GuestSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestSession>;
    const password = typeof parsed.password === "string" ? parsed.password : "";
    if (!parsed.nickname || !/^\d{4}$/.test(password)) return null;
    if (needsNicknameRefresh(parsed.nickname)) return null;
    return {
      nickname: parsed.nickname.slice(0, 32),
      password
    };
  } catch {
    return null;
  }
};

export const getGuestSession = (): GuestSession => {
  const stored = readStoredSession();
  if (stored) return stored;

  const nextSession = {
    nickname: randomKoreanNickname(),
    password: randomPassword()
  };
  saveGuestSession(nextSession);
  return nextSession;
};

export const saveGuestSession = (session: Partial<GuestSession>) => {
  if (typeof window === "undefined") return;
  const previous = readStoredSession() || {
    nickname: randomKoreanNickname(),
    password: randomPassword()
  };
  const nextSession = {
    nickname: (session.nickname || previous.nickname).trim().slice(0, 32) || previous.nickname,
    password: /^\d{4}$/.test(session.password || "") ? String(session.password) : previous.password
  };
  window.sessionStorage.setItem(storageKey, JSON.stringify(nextSession));
};
