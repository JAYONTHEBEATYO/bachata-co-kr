"use client";

import Link from "next/link";
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

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <details className="header-menu mobile-menu">
            <summary className="icon-button" aria-label="메뉴 열기"><Menu size={22} /></summary>
            <nav className="menu-panel" aria-label="전체 메뉴">
              {menu.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
              {!loading && user ? (
                <>
                  <Link href="/profile"><Settings size={16} />프로필 꾸미기</Link>
                  <button type="button" onClick={() => void logout()}><LogOut size={16} />로그아웃</button>
                </>
              ) : !loading ? (
                <Link href="/login"><LogIn size={16} />로그인 · 회원가입</Link>
              ) : null}
            </nav>
          </details>

          <BrandMark />
          <SiteSearch />

          <Link className="mobile-search-link" href="/search" aria-label="검색"><Search size={21} /></Link>
          <Link className="write-button" href="/write"><PenLine size={18} /><span>글쓰기</span></Link>

          <details className="header-menu more-menu">
            <summary className="icon-button account-summary" aria-label={user ? "내 계정" : "더보기"}>
              {user
                ? <ProfileAvatar name={user.displayName} avatarUrl={user.avatarUrl} avatarPreset={user.avatarPreset} size={34} />
                : <MoreHorizontal size={22} />}
            </summary>
            <nav className="menu-panel" aria-label="더보기 메뉴">
              {!loading && user ? (
                <>
                  <Link className="account-menu-profile" href="/profile">
                    <ProfileAvatar name={user.displayName} avatarUrl={user.avatarUrl} avatarPreset={user.avatarPreset} size={34} />
                    <span><strong>{user.displayName}</strong><small>@{user.handle}</small></span>
                  </Link>
                  <Link href="/profile"><Settings size={16} />프로필 꾸미기</Link>
                  <button type="button" onClick={() => void logout()}><LogOut size={16} />로그아웃</button>
                </>
              ) : !loading ? (
                <>
                  <Link href="/login"><LogIn size={16} />로그인</Link>
                  <Link href="/login"><UserCircle size={16} />Google로 회원가입</Link>
                </>
              ) : null}
              <Link href="/search"><Search size={16} />검색</Link>
              <Link href="/topics"><Compass size={16} />주제 찾기</Link>
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
