-- recipe4fridge_pic — 신규 가입자 자동 profiles 행 생성 트리거
-- schema.sql 적용 후, SQL Editor에서 이어서 실행

-- auth.users에 새 사용자가 생기면(이메일 가입이든 Google 로그인이든) profiles에 기본값으로 한 줄 만들어준다.
-- security definer로 RLS를 우회해야 하므로 트리거 함수로 구현한다(직접 insert하면 RLS에 막힘).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
