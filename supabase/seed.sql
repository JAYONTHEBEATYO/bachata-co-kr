insert into public.communities (slug, name, description, color, member_count)
values
  ('hot', '인기', '오늘 바차타 코리아에서 가장 많이 반응한 글입니다.', '#ff5a3d', 1280),
  ('video', '영상', '유튜브, 소셜 영상, 워크숍 클립을 보고 이야기합니다.', '#4f7cff', 920),
  ('events', '행사', '국내외 페스티벌, 워크숍, 소셜 일정을 모읍니다.', '#07a074', 760),
  ('questions', '질문', '처음 배우는 사람도 편하게 물어볼 수 있는 공간입니다.', '#ad6cff', 640),
  ('dancers', '댄서', '국내외 댄서, 팀, 크루, 강사 이야기를 정리합니다.', '#f5a524', 530),
  ('guide', '가이드', '바차타 베이직과 장르별 핵심을 차근차근 정리합니다.', '#0c8f70', 680)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  color = excluded.color,
  member_count = excluded.member_count;

insert into public.threads (
  community_id,
  author_name,
  slug,
  title,
  excerpt,
  body,
  flair,
  video_id,
  source_links,
  tags,
  pinned
)
select
  c.id,
  seed.author_name,
  seed.slug,
  seed.title,
  seed.excerpt,
  seed.body,
  seed.flair,
  seed.video_id,
  seed.source_links::jsonb,
  seed.tags,
  seed.pinned
from (
  values
    ('questions', 'Bachata Korea', 'bachata-basic-first-watch', '바차타 베이직 먼저 파악하기', '이제 막 바차타가 궁금해졌다면, 스텝 이름보다 박자와 체중 이동을 먼저 보면 훨씬 빨리 감이 옵니다.', '바차타 베이직은 바차타 커플댄스를 추기 위해서 가장 기초적이면서도 중요합니다. 스텝 자체는 단순해 보여도, 실제로는 박자 안에서 체중을 어떻게 옮기는지, 골반과 상체가 어느 정도로 따라오는지, 파트너와 거리를 어떻게 유지하는지가 함께 들어 있습니다.', '입문', 'RaIjKG_ENIU', '[{"label":"참고 영상","url":"https://www.youtube.com/watch?v=RaIjKG_ENIU"}]', array['바차타 베이직','입문','bachata basic'], true),
    ('video', 'zumjersy', 'bachata-influence-melvin-gatica-points', 'Bachata Influence, 테크닉보다 중요하게 생각하는 포인트!', 'Melvin & Gatica 계열을 볼 때는 큰 동작보다 프레임, 전환, 감정선의 밀도 조절이 먼저 보입니다.', 'Melvin & Gatica 계열의 Bachata Influence 영상을 살펴보면, 기존 센슈얼 바차타와 비슷해 보이는 웨이브나 트릭보다 프레임, 전환, 감정선의 밀도 조절이 더 중요해 보입니다.', 'Bachata Influence', 'sUy5L7x5pyE', '[{"label":"Melvin & Gatica 영상","url":"https://www.youtube.com/watch?v=sUy5L7x5pyE"}]', array['Bachata Influence','Melvin Gatica','센슈얼 바차타'], false),
    ('events', 'Bachata Korea', 'festival-calendar-july-2026', '이번 달 국내 바차타 페스티벌과 워크숍 체크', '날짜, 장소, 패스 범위는 공식 링크로 다시 확인하고, 영상으로 분위기까지 미리 봅니다.', '바차타 행사 정보는 인스타그램, 예매 페이지, 스튜디오 공지, 유튜브 영상에 흩어져 있는 경우가 많습니다. 그래서 일정만 보는 것보다 어떤 워크숍이 열리는지, 소셜 비중이 큰지 함께 보는 편이 좋습니다.', '페스티벌', 'zQXNPwMqpdw', '[{"label":"K-Sensual Instagram","url":"https://www.instagram.com/ksensual_official/"}]', array['페스티벌','워크숍','K-Sensual'], false)
) as seed(community_slug, author_name, slug, title, excerpt, body, flair, video_id, source_links, tags, pinned)
join public.communities c on c.slug = seed.community_slug
where not exists (
  select 1 from public.threads t where t.slug = seed.slug
);
