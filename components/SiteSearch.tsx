"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

const searchableSelector = ".thread-card, .event-card, .dancer-card, .guide-card";

const applyFilter = (query: string) => {
  const value = query.trim().toLowerCase();
  document.querySelectorAll<HTMLElement>(searchableSelector).forEach((card) => {
    const haystack = card.textContent?.toLowerCase() || "";
    const filteredOut = Boolean(value) && !haystack.includes(value);
    card.hidden = filteredOut;
    card.classList.toggle("is-filtered-out", filteredOut);
  });
};

export function SiteSearch() {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q") || "";
    setQuery(initial);
    applyFilter(initial);
  }, []);

  const updateQuery = (value: string) => {
    setQuery(value);
    applyFilter(value);
    const url = new URL(window.location.href);
    if (value.trim()) {
      url.searchParams.set("q", value.trim());
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState(null, "", url);
  };

  return (
    <form
      className="search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        applyFilter(query);
      }}
    >
      <Search size={18} />
      <input
        type="search"
        name="q"
        value={query}
        placeholder="바차타, 센슈얼, 페스티벌 검색"
        aria-label="검색"
        onChange={(event) => updateQuery(event.currentTarget.value)}
      />
    </form>
  );
}
