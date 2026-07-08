drop policy if exists "authenticated users create comments" on public.comments;

create policy "anonymous visitors create comments"
on public.comments
for insert
with check (
  status = 'published'
  and author_id is null
  and length(trim(author_name)) between 1 and 40
  and length(trim(body)) between 2 and 1000
);

create policy "authenticated users create comments"
on public.comments
for insert
with check (
  auth.uid() is not null
  and status = 'published'
  and length(trim(body)) between 2 and 1000
);
