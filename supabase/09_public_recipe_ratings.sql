-- recipe4fridge_pic — "관리자" 메뉴를 전체 회원 공개 "레시피 평가 집계"로 전환.
-- 08_admin_recipes_policy.sql 적용 후, SQL Editor에서 이어서 실행
--
-- 지금까지 recipes/recipe_feedback은 본인 것만(또는 관리자만 recipes/feedback을 조회)
-- 볼 수 있었다. 이제 다른 사람이 추천받은 레시피의 재료/조리법도 열람하고 좋아요·싫어요·
-- 코멘트를 남길 수 있어야 하고, 집계 결과도 전체 회원에게 공개해야 한다.
--
-- 냉장고 사진(fridge_images)·재료 인식 결과(detected_ingredients)·세션(fridge_sessions)은
-- 이번 변경에 포함하지 않는다 — 레시피 텍스트(제목/재료/조리법)만 공개하고, 그게 누구의
-- 냉장고에서 나왔는지는 여전히 비공개로 유지한다.

create policy "recipes_authenticated_select" on recipes
  for select
  using (auth.uid() is not null);

create policy "recipe_feedback_authenticated_select" on recipe_feedback
  for select
  using (auth.uid() is not null);
