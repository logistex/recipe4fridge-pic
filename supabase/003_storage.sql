-- recipe4fridge_pic — 냉장고 사진 저장용 Storage 버킷
-- schema.sql, 002_auth_trigger.sql 적용 후, SQL Editor에서 이어서 실행

-- 비공개 버킷: 업로드된 냉장고 사진은 본인만 접근 가능해야 하므로 public=false
insert into storage.buckets (id, name, public)
values ('fridge-images', 'fridge-images', false)
on conflict (id) do nothing;

-- 업로드 경로 규칙: {user_id}/{session_id}/{순번}.jpg
-- storage.foldername(name)의 첫 번째 요소가 곧 업로더의 user_id가 되도록 강제
create policy "fridge_images_owner_select" on storage.objects
  for select
  using (
    bucket_id = 'fridge-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fridge_images_owner_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'fridge-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fridge_images_owner_delete" on storage.objects
  for delete
  using (
    bucket_id = 'fridge-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
