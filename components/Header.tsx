import Link from "next/link";
import { Home, Menu, MessageSquareText, MoreHorizontal, PenSquare, Search } from "lucide-react";
import { SiteSearch } from "./SiteSearch";

const menu = [
  { href: "/", label: "홈" },
  { href: "/topics", label: "주제 탐색" },
  { href: "/write", label: "글쓰기" }
];

export function Header() {
  return (
    <>
      <header className="site-header">
        <details className="header-menu">
          <summary className="icon-button" aria-label="메뉴 열기"><Menu size={22} /></summary>
          <nav className="menu-panel" aria-label="전체 메뉴">
            {menu.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </nav>
        </details>

        <Link className="brand" href="/" aria-label="바차타 코리아 홈">
          <span className="brand-mark">B</span>
          <strong>바차타 코리아</strong>
        </Link>

        <SiteSearch />

        <Link className="write-button" href="/write"><PenSquare size={18} /><span>글쓰기</span></Link>

        <details className="header-menu more-menu">
          <summary className="icon-button" aria-label="더보기"><MoreHorizontal size={22} /></summary>
          <nav className="menu-panel" aria-label="더보기 메뉴">
            <Link href="/search"><Search size={16} />검색</Link>
            <Link href="/topics"><MessageSquareText size={16} />주제 탐색</Link>
          </nav>
        </details>
      </header>

      <nav className="bottom-nav" aria-label="모바일 메뉴">
        <Link href="/"><Home size={21} /><span>홈</span></Link>
        <Link href="/topics"><MessageSquareText size={21} /><span>주제</span></Link>
        <Link href="/write"><PenSquare size={21} /><span>쓰기</span></Link>
      </nav>
    </>
  );
}
