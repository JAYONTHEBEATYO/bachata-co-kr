import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "바차타 코리아의 개인정보 수집 및 이용 안내입니다.",
  robots: { index: true, follow: true }
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article>
        <Link className="legal-brand" href="/">BACHATA.CO.KR</Link>
        <span className="section-kicker">PRIVACY</span>
        <h1>개인정보 처리방침</h1>
        <p className="legal-updated">시행일 2026년 7월 26일</p>

        <section>
          <h2>어떤 정보를 받나요?</h2>
          <p>
            Google로 가입하면 계정을 구분하는 식별값, 이메일 주소, 이름과 프로필
            사진을 받습니다. 이메일 주소는 로그인과 계정 관리에만 사용하며 공개
            프로필에는 표시하지 않습니다.
          </p>
        </section>
        <section>
          <h2>프로필과 게시물</h2>
          <p>
            닉네임, 프로필 사진, 한 줄 소개, 활동 지역, 선호 장르는 사용자가 직접
            공개 범위를 확인하고 등록하는 정보입니다. 공개 게시물과 댓글은 다른
            이용자와 검색 서비스에 노출될 수 있습니다.
          </p>
        </section>
        <section>
          <h2>비회원 이용 기록</h2>
          <p>
            비회원 글과 댓글의 관리, 도배 방지, 신고 처리에 필요한 범위에서 접속
            기록을 보관합니다. 화면에는 전체 IP 주소를 공개하지 않고 일부만
            가려서 표시합니다.
          </p>
        </section>
        <section>
          <h2>서비스 이용 분석</h2>
          <p>
            사이트 개선을 위해 방문한 페이지, 익명 방문자 식별값, 접속 기기 유형,
            체류시간과 스크롤 깊이를 기록합니다. 분석용 식별값은 무작위로 만들고
            서버에서 다시 암호화하며, 관리자 분석 화면에는 원본 IP 주소를
            저장하거나 표시하지 않습니다. 브라우저의 추적 거부 설정을 켜면 이
            분석을 실행하지 않습니다.
          </p>
        </section>
        <section>
          <h2>포스터 분석</h2>
          <p>
            행사·홍보 글에서 사용자가 포스터 분석을 직접 실행하면 업로드한 이미지와
            이미지에서 읽은 문구를 Cloudflare의 인공지능 서비스로 전송합니다.
            분석 결과는 같은 이미지를 반복 처리하지 않고 사용 횟수를 관리하기 위해
            보관합니다. 결과는 글에 자동으로 공개되지 않으며, 사용자가 내용을
            확인하고 편집 화면에 넣은 뒤 게시해야 합니다.
          </p>
        </section>
        <section>
          <h2>보관과 삭제</h2>
          <p>
            로그인 세션은 마지막 발급일로부터 최대 30일 동안 유지됩니다. 계정
            정보의 수정이나 삭제가 필요하면 사이트의 신고·문의 채널로 요청할 수
            있습니다. 법령상 보관 의무가 있는 자료는 해당 기간이 지난 뒤
            삭제합니다.
          </p>
        </section>
        <section>
          <h2>외부 서비스</h2>
          <p>
            로그인에는 Google Identity Services를, 이미지와 영상 전송에는
            Cloudflare 서비스를 사용합니다. 포스터 분석을 실행한 경우에는
            Cloudflare Workers AI도 함께 사용합니다. 각 서비스에서 처리되는
            정보에는 해당 사업자의 개인정보 처리방침이 함께 적용됩니다.
          </p>
        </section>
      </article>
    </main>
  );
}
