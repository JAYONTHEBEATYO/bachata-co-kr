import Link from "next/link";
import { Flame, Home, LogIn, Menu, MoreVertical, PenSquare, Sparkles, UserCircle, UserPlus } from "lucide-react";
import { SiteSearch } from "./SiteSearch";

const nav = [
  { href: "/", label: "인기" },
  { href: "/?sort=top", label: "베스트 컨텐츠" },
  { href: "/?sort=new", label: "최신" },
  { href: "/videos", label: "영상" },
  { href: "/events", label: "행사" },
  { href: "/guide", label: "가이드" },
  { href: "/dancers", label: "댄서" }
];

export function Header() {
  return (
    <>
      <header className="site-header">
        <div className="brand-wrap">
          <details className="header-menu">
            <summary className="icon-menu-button" aria-label="메뉴 열기">
              <Menu size={22} />
            </summary>
            <div className="menu-panel">
              {nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            </div>
          </details>
          <Link className="brand" href="/">
            <span className="brand-mark">B</span>
            <span>
              <strong>바차타 코리아</strong>
              <em>Bachata Korea</em>
            </span>
          </Link>
        </div>
        <nav className="top-nav" aria-label="주요 메뉴">
          {nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <SiteSearch />
        <div className="header-actions">
          <Link className="write-button" href="/write"><PenSquare size={18} /> 글쓰기</Link>
          <details className="header-menu more-menu">
            <summary className="icon-menu-button" aria-label="더보기">
              <MoreVertical size={22} />
            </summary>
            <div className="menu-panel">
              <Link href="/profile"><UserCircle size={17} /> 내 프로필</Link>
              <Link href="/"><LogIn size={17} /> 로그인</Link>
              <Link href="/"><UserPlus size={17} /> 회원가입</Link>
            </div>
          </details>
        </div>
      </header>
      <nav className="bottom-nav" aria-label="모바일 메뉴">
        <Link href="/"><Home size={20} />홈</Link>
        <Link href="/?sort=hot"><Flame size={20} />인기</Link>
        <Link href="/videos"><Sparkles size={20} />영상</Link>
        <Link href="/write"><PenSquare size={20} />쓰기</Link>
      </nav>
    </>
  );
}
