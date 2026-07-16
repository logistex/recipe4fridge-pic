-- recipe4fridge_pic — AI 모델(비전/텍스트) 품질 평가 시스템.
-- 09_public_recipe_ratings.sql 적용 후, SQL Editor에서 이어서 실행
--
-- 사용자 평가 + AI 판정(OpenRouter 무료 모델, openrouter/free)을 합쳐서 모델별 평점을
-- 매기고, 어떤 비전/텍스트 모델을 우선순위로 쓸지 판단하는 데 쓴다.

-- 세션을 "품질 평가에 공개해도 되는 데이터"로 쓸지 여부. 기본값은 true라서
-- 이 컬럼을 추가한 시점 이후 새로 생성되는 세션은 자동으로 동의한 것으로 간주되고,
-- 아래 UPDATE로 과거 세션은 전부 명시적으로 제외한다 ("앞으로 생성되는 세션부터").
alter table fridge_sessions add column public_consent boolean not null default true;
update fridge_sessions set public_consent = false;

create table model_ratings (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('photo', 'ingredients', 'recipe')),
  session_id uuid references fridge_sessions(id) on delete cascade,
  request_id uuid references recipe_requests(id) on delete cascade,
  provider_id text not null,
  source text not null check (source in ('user', 'ai_judge')),
  user_id uuid references auth.users(id) on delete set null,
  score smallint not null check (score between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  check (
    (subject_type in ('photo', 'ingredients') and session_id is not null and request_id is null)
    or
    (subject_type = 'recipe' and request_id is not null and session_id is null)
  )
);

alter table model_ratings enable row level security;

-- 전체 회원이 모델별 평점 집계를 볼 수 있어야 한다 (docs/PRD.md 취지에 맞춰 관리자 전용에서 공개로 전환).
create policy "model_ratings_authenticated_select" on model_ratings
  for select
  using (auth.uid() is not null);

-- 로그인한 사용자는 자기 세션/요청에 대한 평가를 남길 수 있다(사용자 평가),
-- AI 판정도 같은 사용자 흐름(서버 액션) 안에서 삽입되므로 동일하게 허용한다.
create policy "model_ratings_authenticated_insert" on model_ratings
  for insert
  with check (auth.uid() is not null);
