import Link from "next/link";
import { Compass, Home, Menu, MoreHorizontal, PenLine, Search } from "lucide-react";
import { BrandMark } from "./BrandMark";
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
        <div className="header-inner">
          <details className="header-menu mobile-menu">
            <summary className="icon-button" aria-label="메뉴 열기"><Menu size={22} /></summary>
            <nav className="menu-panel" aria-label="전체 메뉴">
              {menu.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            </nav>
          </details>

          <BrandMark />
          <SiteSearch />

          <Link className="mobile-search-link" href="/search" aria-label="검색"><Search size={21} /></Link>
          <Link className="write-button" href="/write"><PenLine size={18} /><span>글쓰기</span></Link>

          <details className="header-menu more-menu">
            <summary className="icon-button" aria-label="더보기"><MoreHorizontal size={22} /></summary>
            <nav className="menu-panel" aria-label="더보기 메뉴">
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
