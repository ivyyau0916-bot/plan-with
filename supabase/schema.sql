-- PlanWith（約定清單）
-- 在 Supabase SQL Editor 整份執行一次。
-- 需要已啟用的 Email Auth。若要「用暱稱開始」，再到 Authentication 打開 Anonymous sign-ins。
-- 新用戶會由 trigger 建立 profiles。已執行過舊版的話，再跑一次即可補上欄位、邀請碼函式、成員審核、成員管理與圖片庫。

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) > 0),
  avatar_emoji text not null default '🌷',
  created_at timestamptz not null default now()
);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 24),
  emoji text not null default '💛',
  accent text not null default 'blush' check (accent in ('blush', 'sage', 'sand', 'lilac', 'gold')),
  invite_code text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  joined_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 80),
  description text not null default '',
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'stuck', 'completed')),
  stuck_note text,
  tags text[] not null default '{}',
  link_url text,
  image_urls text[] not null default '{}',
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.reels_ideas (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  url text not null check (char_length(url) between 12 and 500),
  title text not null default '',
  description text not null default '',
  thumbnail_url text,
  tags text[] not null default '{}',
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  converted_to_task_id uuid references public.tasks (id) on delete set null,
  unique (space_id, url)
);

alter table public.reels_ideas add column if not exists description text not null default '';
alter table public.reels_ideas add column if not exists tags text[] not null default '{}';

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);

create table if not exists public.reward_catalog (
  id text primary key,
  name text not null,
  emoji text not null,
  description text not null default '',
  tier text not null default 'free' check (tier in ('free', 'premium'))
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  catalog_id text not null references public.reward_catalog (id),
  message text not null default '',
  created_at timestamptz not null default now()
);

-- 付費禮物的解鎖紀錄。現在沒有結帳流程，之後由後端寫入這張表即可開放。
create table if not exists public.reward_unlocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  catalog_id text not null references public.reward_catalog (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, catalog_id)
);

create index if not exists space_members_user_idx on public.space_members (user_id);
create index if not exists space_members_space_idx on public.space_members (space_id);
create index if not exists tasks_space_idx on public.tasks (space_id, status);
create index if not exists comments_task_idx on public.comments (task_id, created_at);
create index if not exists rewards_space_idx on public.rewards (space_id, created_at desc);
create index if not exists rewards_receiver_idx on public.rewards (space_id, to_user_id, catalog_id);
create index if not exists reels_space_idx on public.reels_ideas (space_id, created_at desc);

alter table public.tasks add column if not exists tags text[] not null default '{}';
alter table public.tasks add column if not exists link_url text;
alter table public.tasks add column if not exists image_urls text[] not null default '{}';

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  description text not null default '',
  icon_emoji text not null default '✨',
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (char_length(description) <= 200),
  check (char_length(icon_emoji) between 1 and 16)
);

alter table public.tasks add column if not exists project_id uuid;

do $$
begin
  alter table public.tasks
    add constraint tasks_project_id_fkey
    foreign key (project_id) references public.projects (id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create index if not exists projects_space_idx on public.projects (space_id, created_at);
create index if not exists tasks_project_idx on public.tasks (project_id);

do $$
begin
  alter table public.tasks
    add constraint tasks_tags_limit check (cardinality(tags) <= 8);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.tasks
    add constraint tasks_images_limit check (cardinality(image_urls) <= 4);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.tasks
    add constraint tasks_link_url_limit check (link_url is null or char_length(link_url) <= 500);
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Auth profile + invite helpers
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_emoji)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), nullif(split_part(new.email, '@', 1), ''), '新朋友'),
    coalesce(nullif(new.raw_user_meta_data->>'avatar_emoji', ''), '🌷')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

alter table public.space_members
  add column if not exists status text not null default 'approved';

do $$
begin
  alter table public.space_members
    add constraint space_members_status_check
    check (status in ('pending', 'approved', 'rejected'));
exception
  when duplicate_object then null;
end $$;

create or replace function public.is_space_member(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = sid
      and user_id = auth.uid()
      and status = 'approved'
  );
$$;

create or replace function public.generate_invite_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..3 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    code := code || '-' || lpad((floor(random() * 900) + 100)::int::text, 3, '0');
    exit when not exists (select 1 from public.spaces where invite_code = code);
  end loop;
  return code;
end;
$$;

alter table public.spaces add column if not exists accent text not null default 'blush';

do $$
begin
  alter table public.spaces
    add constraint spaces_accent_check
    check (accent in ('blush', 'sage', 'sand', 'lilac', 'gold'));
exception
  when duplicate_object then null;
end $$;

drop function if exists public.create_space(text, text);

create or replace function public.create_space(space_name text, space_emoji text, space_accent text default 'blush')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
  chosen text := coalesce(nullif(space_accent, ''), 'blush');
begin
  if auth.uid() is null then
    raise exception '請先登入';
  end if;
  if length(trim(coalesce(space_name, ''))) = 0 then
    raise exception '空間名稱要寫一下';
  end if;
  if chosen not in ('blush', 'sage', 'sand', 'lilac', 'gold') then
    chosen := 'blush';
  end if;

  insert into public.spaces (name, emoji, accent, invite_code, created_by)
  values (
    left(trim(space_name), 24),
    coalesce(nullif(space_emoji, ''), '💛'),
    chosen,
    public.generate_invite_code(),
    auth.uid()
  )
  returning id into sid;

  insert into public.space_members (space_id, user_id, role, status)
  values (sid, auth.uid(), 'owner', 'approved');

  return sid;
end;
$$;

create or replace function public.join_space(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
  normalized text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if auth.uid() is null then
    raise exception '請先登入';
  end if;
  if length(normalized) = 6 then
    normalized := substr(normalized, 1, 3) || '-' || substr(normalized, 4, 3);
  else
    normalized := upper(trim(coalesce(code, '')));
  end if;

  select id into sid from public.spaces where invite_code = normalized;
  if sid is null then
    raise exception '找不到這個邀請碼';
  end if;

  insert into public.space_members (space_id, user_id, role, status)
  values (sid, auth.uid(), 'member', 'pending')
  on conflict (space_id, user_id) do update
    set status = 'pending',
        joined_at = now()
    where space_members.status = 'rejected';

  return sid;
end;
$$;

create or replace function public.review_membership(member_id uuid, decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.space_members%rowtype;
begin
  if auth.uid() is null then
    raise exception '請先登入';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception '無法審核這份申請';
  end if;

  select * into target from public.space_members where id = member_id;
  if target.id is null then
    raise exception '找不到這份申請';
  end if;
  if not exists (
    select 1
    from public.space_members
    where space_id = target.space_id
      and user_id = auth.uid()
      and role = 'owner'
      and status = 'approved'
  ) then
    raise exception '只有空間建立者可以審核';
  end if;
  if target.status <> 'pending' then
    raise exception '這份申請已經處理過了';
  end if;

  update public.space_members set status = decision where id = member_id;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.is_space_member(uuid) from public;
revoke all on function public.generate_invite_code() from public;
revoke all on function public.create_space(text, text, text) from public;
revoke all on function public.join_space(text) from public;
revoke all on function public.review_membership(uuid, text) from public;
grant execute on function public.is_space_member(uuid) to authenticated;
grant execute on function public.create_space(text, text, text) to authenticated;
grant execute on function public.join_space(text) to authenticated;
grant execute on function public.review_membership(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.reward_catalog enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_unlocks enable row level security;
alter table public.reels_ideas enable row level security;

drop policy if exists "read own or shared profiles" on public.profiles;
create policy "read own or shared profiles" on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.space_members mine
    join public.space_members theirs on mine.space_id = theirs.space_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "members read spaces" on public.spaces;
create policy "members read spaces" on public.spaces
for select to authenticated
using (
  public.is_space_member(id)
  or exists (
    select 1
    from public.space_members
    where space_members.space_id = spaces.id
      and space_members.user_id = auth.uid()
      and space_members.status = 'pending'
  )
);

drop policy if exists "members read membership" on public.space_members;
create policy "members read membership" on public.space_members
for select to authenticated
using (public.is_space_member(space_id) or user_id = auth.uid());

drop policy if exists "owners update membership" on public.space_members;
create policy "owners update membership" on public.space_members
for update to authenticated
using (
  exists (
    select 1
    from public.space_members as owner_row
    where owner_row.space_id = space_members.space_id
      and owner_row.user_id = auth.uid()
      and owner_row.role = 'owner'
      and owner_row.status = 'approved'
  )
)
with check (
  exists (
    select 1
    from public.space_members as owner_row
    where owner_row.space_id = space_members.space_id
      and owner_row.user_id = auth.uid()
      and owner_row.role = 'owner'
      and owner_row.status = 'approved'
  )
);

drop policy if exists "owners remove members or self leave" on public.space_members;
create policy "owners remove members or self leave" on public.space_members
for delete to authenticated
using (
  (user_id = auth.uid() and role = 'member')
  or (
    role = 'member'
    and user_id <> auth.uid()
    and exists (
      select 1
      from public.space_members as owner_row
      where owner_row.space_id = space_members.space_id
        and owner_row.user_id = auth.uid()
        and owner_row.role = 'owner'
        and owner_row.status = 'approved'
    )
  )
);

drop policy if exists "members read tasks" on public.tasks;
create policy "members read tasks" on public.tasks
for select to authenticated
using (public.is_space_member(space_id));

drop policy if exists "members insert tasks" on public.tasks;
create policy "members insert tasks" on public.tasks
for insert to authenticated
with check (created_by = auth.uid() and public.is_space_member(space_id));

drop policy if exists "members update tasks" on public.tasks;
create policy "members update tasks" on public.tasks
for update to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

drop policy if exists "members delete tasks" on public.tasks;
create policy "members delete tasks" on public.tasks
for delete to authenticated
using (public.is_space_member(space_id));

alter table public.projects enable row level security;

drop policy if exists "members read projects" on public.projects;
create policy "members read projects" on public.projects
for select to authenticated
using (public.is_space_member(space_id));

drop policy if exists "members insert projects" on public.projects;
create policy "members insert projects" on public.projects
for insert to authenticated
with check (created_by = auth.uid() and public.is_space_member(space_id));

drop policy if exists "members update projects" on public.projects;
create policy "members update projects" on public.projects
for update to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

drop policy if exists "members delete projects" on public.projects;
create policy "members delete projects" on public.projects
for delete to authenticated
using (public.is_space_member(space_id));

drop policy if exists "members read comments" on public.comments;
create policy "members read comments" on public.comments
for select to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = comments.task_id and public.is_space_member(tasks.space_id)
  )
);

drop policy if exists "members insert comments" on public.comments;
create policy "members insert comments" on public.comments
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.tasks
    where tasks.id = task_id and public.is_space_member(tasks.space_id)
  )
);

drop policy if exists "members delete own comments" on public.comments;
create policy "members delete own comments" on public.comments
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "read reward catalog" on public.reward_catalog;
create policy "read reward catalog" on public.reward_catalog
for select to authenticated
using (true);

drop policy if exists "members read rewards" on public.rewards;
create policy "members read rewards" on public.rewards
for select to authenticated
using (public.is_space_member(space_id));

drop policy if exists "members send rewards" on public.rewards;
create policy "members send rewards" on public.rewards
for insert to authenticated
with check (
  from_user_id = auth.uid()
  and public.is_space_member(space_id)
  and exists (
    select 1 from public.space_members
    where space_members.space_id = rewards.space_id
      and space_members.user_id = rewards.to_user_id
  )
  and (
    task_id is null
    or exists (
      select 1 from public.tasks
      where tasks.id = rewards.task_id and tasks.space_id = rewards.space_id
    )
  )
);

drop policy if exists "read own unlocks" on public.reward_unlocks;
create policy "read own unlocks" on public.reward_unlocks
for select to authenticated
using (user_id = auth.uid());

grant select, insert, update on public.profiles to authenticated;
grant select on public.spaces to authenticated;
grant select, update, delete on public.space_members to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant select on public.reward_catalog to authenticated;
grant select, insert on public.rewards to authenticated;

create or replace view public.gift_collections
with (security_invoker = true) as
select
  space_id,
  to_user_id as receiver_id,
  catalog_id as gift_type,
  count(*)::integer as item_count
from public.rewards
group by space_id, to_user_id, catalog_id;

grant select on public.gift_collections to authenticated;
grant select on public.reward_unlocks to authenticated;
grant select, insert, update, delete on public.reels_ideas to authenticated;

drop policy if exists "members read reels" on public.reels_ideas;
create policy "members read reels" on public.reels_ideas
for select to authenticated
using (public.is_space_member(space_id));

drop policy if exists "members insert reels" on public.reels_ideas;
create policy "members insert reels" on public.reels_ideas
for insert to authenticated
with check (created_by = auth.uid() and public.is_space_member(space_id));

drop policy if exists "members update reels" on public.reels_ideas;
create policy "members update reels" on public.reels_ideas
for update to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

drop policy if exists "members delete reels" on public.reels_ideas;
create policy "members delete reels" on public.reels_ideas
for delete to authenticated
using (public.is_space_member(space_id));

-- ---------------------------------------------------------------------------
-- Reward catalog. Premium rows stay locked until reward_unlocks has a row.
-- ---------------------------------------------------------------------------

insert into public.reward_catalog (id, name, emoji, description, tier) values
  ('pat', '摸摸頭', '🐾', '今天也辛苦了', 'free'),
  ('boba', '珍奶一杯', '🧋', '半糖去冰，虛擬也好喝', 'free'),
  ('hug', '小熊抱抱', '🧸', '借你充電三十秒', 'free'),
  ('star', '星星貼紙', '⭐', '貼在完成的那一件上', 'free'),
  ('cocoa', '熱可可', '☕', '加一朵棉花糖', 'free'),
  ('bouquet', '小花束', '💐', '不用澆水的那種', 'free'),
  ('fireworks', '煙火特效', '🎆', '完成當下綻放', 'premium'),
  ('letter', '月光信封', '💌', '打開才看得到的話', 'premium'),
  ('sakura', '櫻花雨', '🌸', '畫面下起一陣花', 'premium'),
  ('frame', '金框相框', '🖼️', '把這件事裱起來', 'premium')
on conflict (id) do update
set name = excluded.name,
    emoji = excluded.emoji,
    description = excluded.description,
    tier = excluded.tier;

-- ---------------------------------------------------------------------------
-- Task images. Public URLs are stored on the task; only space members can upload.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-images',
  'task-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read task images" on storage.objects;
create policy "public read task images"
on storage.objects for select
to public
using (bucket_id = 'task-images');

drop policy if exists "members upload task images" on storage.objects;
create policy "members upload task images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'task-images'
  and public.is_space_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "members delete task images" on storage.objects;
create policy "members delete task images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'task-images'
  and public.is_space_member(((storage.foldername(name))[1])::uuid)
);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
declare
  tbl text;
begin
  foreach tbl in array array['tasks', 'comments', 'rewards', 'spaces', 'space_members', 'reels_ideas', 'projects']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;
