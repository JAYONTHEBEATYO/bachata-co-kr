import Link from "next/link";
import { Bell, Flame, Home, PenSquare, Search, Sparkles, UserCircle } from "lucide-react";

const nav = [
  { href: "/", label: "인기" },
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
        <Link className="brand" href="/">
          <span className="brand-mark">B</span>
          <span>
            <strong>바차타 코리아</strong>
            <em>Bachata Korea</em>
          </span>
        </Link>
        <nav className="top-nav" aria-label="주요 메뉴">
          {nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <form className="search" role="search">
          <Search size={18} />
          <input type="search" placeholder="바차타, 센슈얼, 페스티벌 검색" aria-label="검색" />
        </form>
        <div className="header-actions">
          <Link className="write-button" href="/write"><PenSquare size={18} /> 글쓰기</Link>
          <button type="button" aria-label="알림"><Bell size={19} /></button>
          <button type="button" aria-label="로그인"><UserCircle size={22} /></button>
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
