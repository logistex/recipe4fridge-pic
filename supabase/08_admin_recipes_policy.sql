-- recipe4fridge_pic — 관리자가 모든 레시피를 조회할 수 있도록 정책 추가
-- 07_storage_limits.sql 적용 후, SQL Editor에서 이어서 실행
--
-- recipes 테이블은 원래 요청 소유자만 조회 가능하다. 관리자 대시보드에서
-- 레시피 제목을 보여주려면(recipe_feedback과 조인) 관리자에게도 조회 권한이 필요하다.

create policy "recipes_admin_select" on recipes
  for select
  using (exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.is_admin = true
  ));
