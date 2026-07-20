import { Search } from "lucide-react";

export function SiteSearch() {
  return (
    <form className="search" role="search" action="/search" method="get">
      <Search size={18} />
      <input
        type="search"
        name="q"
        placeholder="바차타, 센슈얼, 페스티벌 검색"
        aria-label="검색"
        minLength={2}
      />
    </form>
  );
}
