import Link from "next/link";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand ${compact ? "is-compact" : ""}`} href="/" aria-label="바차타 코리아 홈">
      <span className="brand-mark" aria-hidden="true">
        <b>B</b>
        <i />
      </span>
      <span className="brand-copy">
        <strong>BACHATA.KR</strong>
        <small>바차타 코리아</small>
      </span>
    </Link>
  );
}
