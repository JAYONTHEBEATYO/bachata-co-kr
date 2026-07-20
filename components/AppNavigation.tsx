"use client";

import Link from "next/link";
import { Compass, Home, PenLine } from "lucide-react";
import { usePathname } from "next/navigation";
import type { Community } from "@/lib/types";
import { CommunityIcon } from "./CommunityIcon";

export function AppNavigation({ communities }: { communities: Community[] }) {
  const pathname = usePathname();
  const isCurrent = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="left-rail">
      <nav className="left-primary-nav" aria-label="주요 메뉴">
        <Link href="/" aria-current={isCurrent("/") ? "page" : undefined}><Home size={19} />홈</Link>
        <Link href="/topics" aria-current={isCurrent("/topics") ? "page" : undefined}><Compass size={19} />주제 찾기</Link>
        <Link href="/write" aria-current={isCurrent("/write") ? "page" : undefined}><PenLine size={19} />글쓰기</Link>
      </nav>

      <div className="left-rail-section">
        <p className="rail-label">BOARDS</p>
        <nav className="left-community-nav" aria-label="바차타 주제">
          {communities.map((community) => {
            const href = `/c/${community.slug}`;
            return (
              <Link key={community.slug} href={href} aria-current={isCurrent(href) ? "page" : undefined}>
                <CommunityIcon category={community.category} color={community.color} size={16} />
                <span>{community.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rhythm-stamp" aria-label="바차타 리듬 카운트">
        <span>1</span><span>2</span><span>3</span><span>4</span>
        <i />
        <span>5</span><span>6</span><span>7</span><span>8</span>
      </div>
    </aside>
  );
}
