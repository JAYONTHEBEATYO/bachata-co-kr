import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관",
  description: "바차타 코리아 커뮤니티 이용약관입니다.",
  robots: { index: true, follow: true }
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <article>
        <Link className="legal-brand" href="/">BACHATA.CO.KR</Link>
        <span className="section-kicker">TERMS</span>
        <h1>이용약관</h1>
        <p className="legal-updated">시행일 2026년 7월 25일</p>

        <section>
          <h2>서비스의 목적</h2>
          <p>
            바차타 코리아는 바차타 영상, 수업, 소셜, 행사와 댄서 이야기를 나누는
            커뮤니티입니다. 회원과 비회원 모두 정해진 방식에 따라 글과 댓글을
            남길 수 있습니다.
          </p>
        </section>
        <section>
          <h2>이용자의 책임</h2>
          <p>
            작성한 글, 댓글, 이미지와 영상에 대한 책임은 작성자에게 있습니다.
            타인의 개인정보를 공개하거나 저작권을 침해하는 자료, 불법 정보,
            반복적인 광고와 괴롭힘은 등록할 수 없습니다.
          </p>
        </section>
        <section>
          <h2>게시물 관리</h2>
          <p>
            운영자는 신고가 접수됐거나 다른 이용자에게 명백한 피해를 줄 수 있는
            게시물을 확인한 뒤 숨김 또는 삭제할 수 있습니다. 추천 수나 조회 수를
            인위적으로 조작하는 행위도 제한될 수 있습니다.
          </p>
        </section>
        <section>
          <h2>계정과 비회원 비밀번호</h2>
          <p>
            회원은 Google 계정으로 로그인하고 자신의 게시물을 관리할 수 있습니다.
            비회원은 작성할 때 정한 임시 비밀번호로 글과 댓글을 수정하거나
            삭제합니다. 비밀번호를 잊은 경우 복구가 어려울 수 있습니다.
          </p>
        </section>
        <section>
          <h2>서비스 변경</h2>
          <p>
            기능, 운영 정책과 화면 구성은 서비스 품질과 안전을 위해 변경될 수
            있습니다. 중요한 변경은 사이트 안에서 알리겠습니다.
          </p>
        </section>
      </article>
    </main>
  );
}
