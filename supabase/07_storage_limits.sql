-- recipe4fridge_pic — Storage 버킷에 용량/형식 제한 설정
-- 05_recipes_insert_policy.sql 적용 후, SQL Editor에서 이어서 실행
--
-- 업로드 화면은 사진을 브라우저에서 리사이즈한 뒤 바로 Storage에 올린다(서버 액션을 거치지 않음).
-- 그래서 "서버 코드에서 검증"하는 대신, Storage 자체에 용량/형식 제한을 걸어
-- 리사이즈를 건너뛴 비정상적인 요청도 버킷 단에서 막히게 한다 (docs/PRD.md 8.1).

update storage.buckets
set
  file_size_limit = 8388608, -- 8MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'fridge-images';
