"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  Compass,
  Home,
  LogIn,
  LogOut,
  Menu,
  MoreHorizontal,
  PenLine,
  Search,
  Settings,
  ShieldCheck,
  UserCircle
} from "lucide-react";
import { BrandMark } from "./BrandMark";
import { SiteSearch } from "./SiteSearch";
import { useAuth } from "./AuthProvider";
import { ProfileAvatar } from "./ProfileAvatar";

const menu = [
  { href: "/", label: "홈" },
  { href: "/topics", label: "주제 탐색" },
  { href: "/write", label: "글쓰기" }
];

export function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDetailsElement | null>(null);
  const accountMenuRef = useRef<HTMLDetailsElement | null>(null);

  const closeMenus = (restoreFocus = false) => {
    const openMenu = accountMenuRef.current?.open
      ? accountMenuRef.current
      : mobileMenuRef.current?.open
        ? mobileMenuRef.current
        : null;
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
    if (accountMenuRef.current) accountMenuRef.current.open = false;
    if (restoreFocus) queueMicrotask(() => openMenu?.querySelector<HTMLElement>("summary")?.focus());
  };

  useEffect(() => {
    closeMenus();
  }, [pathname]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const insideMobile = mobileMenuRef.current?.contains(target);
      const insideAccount = accountMenuRef.current?.contains(target);
      if (!insideMobile && !insideAccount) closeMenus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenus(true);
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!mobileMenuRef.current?.contains(target) && !accountMenuRef.current?.contains(target)) {
        closeMenus();
      }
    };
    const onWindowBlur = () => closeMenus();
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <details
            ref={mobileMenuRef}
            className="header-menu mobile-menu"
            onToggle={(event) => {
              if (event.currentTarget.open && accountMenuRef.current) {
                accountMenuRef.current.open = false;
              }
            }}
          >
            <summary className="icon-button" aria-label="메뉴 열기"><Menu size={22} /></summary>
            <nav className="menu-panel" aria-label="전체 메뉴">
              {menu.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => closeMenus()}>{item.label}</Link>
              ))}
              {!loading && user ? (
                <>
                  <Link href="/profile" onClick={() => closeMenus()}><Settings size={16} />프로필 꾸미기</Link>
                  {user.role === "admin"
                    ? <Link href="/admin" onClick={() => closeMenus()}><ShieldCheck size={16} />관리자</Link>
                    : null}
                  <button
                    type="button"
                    onClick={() => {
                      closeMenus();
                      void logout();
                    }}
                  ><LogOut size={16} />로그아웃</button>
                </>
              ) : !loading ? (
                <Link href="/login" onClick={() => closeMenus()}><LogIn size={16} />로그인 · 회원가입</Link>
              ) : null}
            </nav>
          </details>

          <BrandMark />
          <SiteSearch />

          <Link className="mobile-search-link" href="/search" aria-label="검색"><Search size={21} /></Link>
          <Link className="write-button" href="/write"><PenLine size={18} /><span>글쓰기</span></Link>

          <details
            ref={accountMenuRef}
            className="header-menu more-menu"
            onToggle={(event) => {
              if (event.currentTarget.open && mobileMenuRef.current) {
                mobileMenuRef.current.open = false;
              }
            }}
          >
            <summary className="icon-button account-summary" aria-label={user ? "내 계정" : "더보기"}>
              {user
                ? <ProfileAvatar name={user.displayName} avatarUrl={user.avatarUrl} avatarPreset={user.avatarPreset} size={34} />
                : <MoreHorizontal size={22} />}
            </summary>
            <nav className="menu-panel" aria-label="더보기 메뉴">
              {!loading && user ? (
                <>
                  <Link className="account-menu-profile" href="/profile" onClick={() => closeMenus()}>
                    <ProfileAvatar name={user.displayName} avatarUrl={user.avatarUrl} avatarPreset={user.avatarPreset} size={34} />
                    <span><strong>{user.displayName}</strong><small>@{user.handle}</small></span>
                  </Link>
                  <Link href="/profile" onClick={() => closeMenus()}><Settings size={16} />프로필 꾸미기</Link>
                  {user.role === "admin"
                    ? <Link href="/admin" onClick={() => closeMenus()}><ShieldCheck size={16} />관리자</Link>
                    : null}
                  <button
                    type="button"
                    onClick={() => {
                      closeMenus();
                      void logout();
                    }}
                  ><LogOut size={16} />로그아웃</button>
                </>
              ) : !loading ? (
                <>
                  <Link href="/login" onClick={() => closeMenus()}><LogIn size={16} />로그인</Link>
                  <Link href="/login" onClick={() => closeMenus()}><UserCircle size={16} />Google로 회원가입</Link>
                </>
              ) : null}
              <Link href="/search" onClick={() => closeMenus()}><Search size={16} />검색</Link>
              <Link href="/topics" onClick={() => closeMenus()}><Compass size={16} />주제 찾기</Link>
            </nav>
          </details>
        </div>
      </header>

      <nav className="bottom-nav" aria-label="모바일 메뉴">
        <Link href="/"><Home size={21} /><span>홈</span></Link>
        <Link href="/topics"><Compass size={21} /><span>주제</span></Link>
        <Link href="/search"><Search size={21} /><span>검색</span></Link>
        <Link className="bottom-write" href="/write"><PenLine size={21} /><span>쓰기</span></Link>
      </nav>
    </>
  );
}
