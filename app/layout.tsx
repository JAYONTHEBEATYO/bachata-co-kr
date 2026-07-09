import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { absoluteUrl } from "@/lib/format";
import { DEFAULT_SHARE_IMAGE } from "@/lib/share-meta";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: "바차타 코리아 - Bachata Korea",
    template: "%s | 바차타 코리아"
  },
  description: "바차타 영상, 국내 소셜, 해외 페스티벌, 댄서와 질문을 쓰레드로 모아보는 한국 바차타 커뮤니티입니다.",
  keywords: ["바차타", "bachata", "센슈얼 바차타", "도미니칸 바차타", "바차타 페스티벌", "바차타 소셜"],
  openGraph: {
    title: "바차타 코리아",
    description: "바차타, 어디까지 알고 있니? 국내 소식과 해외 페스티벌, 영상과 질문까지 한 번에 만나는 커뮤니티.",
    url: absoluteUrl("/"),
    siteName: "바차타 코리아",
    locale: "ko_KR",
    type: "website",
    images: [{ url: DEFAULT_SHARE_IMAGE, width: 1200, height: 630, alt: "바차타 코리아" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "바차타 코리아",
    description: "바차타 영상과 소식을 쓰레드로 모아보는 한국 바차타 커뮤니티.",
    images: [DEFAULT_SHARE_IMAGE]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#ffffff"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: "바차타 코리아",
    alternateName: "Bachata Korea",
    url: absoluteUrl("/"),
    inLanguage: "ko-KR",
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/")}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="ko">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Header />
        {children}
      </body>
    </html>
  );
}
