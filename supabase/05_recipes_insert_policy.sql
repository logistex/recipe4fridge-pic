-- recipe4fridge_pic — recipes 테이블에 삽입 정책 추가
-- 003_storage.sql 적용 후, SQL Editor에서 이어서 실행
--
-- 원래 schema.sql에서는 "레시피 생성은 서버 전용(service role) 키로만 한다"고 가정해
-- recipes에 insert 정책을 두지 않았다. 실제로는 로그인한 사용자의 세션으로 서버 액션에서
-- 바로 insert하는 구조라, 본인 소유의 recipe_requests에 한해 insert를 허용해야 한다.

create policy "recipes_owner_insert" on recipes
  for insert
  with check (exists (
    select 1 from recipe_requests r
    where r.id = recipes.request_id and r.user_id = auth.uid()
  ));
