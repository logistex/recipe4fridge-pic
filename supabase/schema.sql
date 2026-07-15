-- recipe4fridge_pic — Supabase (PostgreSQL) 스키마
-- 참고: docs/PRD.md 6장(데이터 모델), 5.5장(디자인 테마)

-- ============================================================
-- 1. Enum 타입
-- ============================================================

create type app_theme as enum ('apricot', 'greens', 'bakery');
-- apricot=달콤 살구, greens=프레시 그린스, bakery=선샤인 베이커리 (docs/PRD.md 5.5 3종 테마와 1:1 대응)

create type cuisine_type as enum ('korean', 'western', 'chinese', 'japanese');
create type spice_level as enum ('none', 'medium', 'hot');
create type difficulty_level as enum ('easy', 'medium', 'hard');
create type time_limit as enum ('under_15', 'under_30', 'no_limit');
create type reaction_type as enum ('like', 'dislike');

-- ============================================================
-- 2. 테이블
-- ============================================================

-- 사용자 프로필 (auth.users 1:1 확장)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  cuisine_type cuisine_type,
  spice_level spice_level,
  difficulty difficulty_level,
  time_limit time_limit,
  theme app_theme not null default 'apricot',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- 냉장고 사진 업로드 1회(최대 3장)를 하나의 세션으로 취급
create table fridge_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vision_provider text not null,
  created_at timestamptz not null default now()
);

create table fridge_images (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references fridge_sessions(id) on delete cascade,
  image_url text not null,
  original_size_bytes integer,
  resized boolean not null default false,
  display_order smallint not null check (display_order between 0 and 2),
  unique (session_id, display_order) -- 세션당 이미지 최대 3장(순번 0~2) 강제
);

create table detected_ingredients (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references fridge_sessions(id) on delete cascade,
  name text not null,
  quantity_text text,
  is_user_edited boolean not null default false
);

-- 레시피 추천 요청. override 필드는 "이번 요청 한정" 선호값(5.2) — NULL이면 profiles 기본값 사용
create table recipe_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references fridge_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text_provider text not null,
  cuisine_override cuisine_type,
  spice_override spice_level,
  difficulty_override difficulty_level,
  time_override time_limit,
  requested_count smallint not null default 3,
  created_at timestamptz not null default now()
);

create table recipes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references recipe_requests(id) on delete cascade,
  title text not null,
  ingredients_json jsonb not null,
  steps_json jsonb not null,
  est_time_minutes integer,
  created_at timestamptz not null default now()
);

create table saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

create table recipe_feedback (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction reaction_type not null,
  comment_text text,
  created_at timestamptz not null default now(),
  unique (recipe_id, user_id) -- 사용자 1명당 레시피 1개에 평가 1건(재평가는 UPDATE)
);

-- ============================================================
-- 3. 관리자 집계 뷰 (5.6)
-- ============================================================

create view recipe_feedback_summary
with (security_invoker = true) -- 조회자의 권한(RLS)을 그대로 적용
as
select
  recipe_id,
  count(*) filter (where reaction = 'like') as likes,
  count(*) filter (where reaction = 'dislike') as dislikes,
  count(comment_text) as comment_count
from recipe_feedback
group by recipe_id;

-- ============================================================
-- 4. Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table fridge_sessions enable row level security;
alter table fridge_images enable row level security;
alter table detected_ingredients enable row level security;
alter table recipe_requests enable row level security;
alter table recipes enable row level security;
alter table saved_recipes enable row level security;
alter table recipe_feedback enable row level security;

-- profiles: 본인 행만 조회/수정/생성
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

-- fridge_sessions: 소유자만 CRUD
create policy "fridge_sessions_owner" on fridge_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- fridge_images / detected_ingredients: 세션 소유자만 (세션 테이블과 조인해 확인)
create policy "fridge_images_owner" on fridge_images
  for all
  using (exists (
    select 1 from fridge_sessions s
    where s.id = fridge_images.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from fridge_sessions s
    where s.id = fridge_images.session_id and s.user_id = auth.uid()
  ));

create policy "detected_ingredients_owner" on detected_ingredients
  for all
  using (exists (
    select 1 from fridge_sessions s
    where s.id = detected_ingredients.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from fridge_sessions s
    where s.id = detected_ingredients.session_id and s.user_id = auth.uid()
  ));

-- recipe_requests: 소유자만 CRUD
create policy "recipe_requests_owner" on recipe_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recipes: 요청 소유자만 조회/생성 가능 (해당 recipe_requests 행이 본인 것일 때만)
create policy "recipes_owner_select" on recipes
  for select
  using (exists (
    select 1 from recipe_requests r
    where r.id = recipes.request_id and r.user_id = auth.uid()
  ));

create policy "recipes_owner_insert" on recipes
  for insert
  with check (exists (
    select 1 from recipe_requests r
    where r.id = recipes.request_id and r.user_id = auth.uid()
  ));

-- saved_recipes: 소유자만 CRUD
create policy "saved_recipes_owner" on saved_recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recipe_feedback: 본인 데이터는 CRUD, 관리자는 전체 조회 가능
create policy "recipe_feedback_owner_write" on recipe_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recipe_feedback_admin_read_all" on recipe_feedback
  for select
  using (exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.is_admin = true
  ));
