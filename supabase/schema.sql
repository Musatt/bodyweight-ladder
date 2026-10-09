-- ============================================================
--  自重訓練階梯：資料庫結構與安全規則
-- ============================================================
--  這份已經套用在 Supabase 專案 bodyweight-ladder
--  （lvhfwadbaxniuyryrngz，東京機房）。
--
--  留在版控裡的用途有兩個：
--    1. 以後想看「資料到底長什麼樣」不用去後台翻
--    2. 哪天要重建或另開一個專案，整份貼進 Supabase 後台的
--       SQL Editor 執行就會長回來
--
--  三張表都開了 RLS（Row Level Security，逐列安全規則）。
--  意思是：就算別人拿到網頁裡那把公開金鑰，資料庫也只會回傳
--  「user_id 等於他自己」的那幾列。沒有 RLS 的話，公開金鑰
--  就等於公開資料庫——這是整套安全性的全部重點。
-- ============================================================

-- 每人一列，記住十條階梯目前各在哪一檔
create table public.ladder_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  tiers      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 每次訓練一列。刻意不做成「一個大陣列整包覆蓋」，
-- 這樣兩台裝置同一天各記一次不會互相洗掉
create table public.workout_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  trained_on date        not null,
  day_key    text        not null check (day_key in ('A','B','C','D')),
  exercises  jsonb       not null default '[]'::jsonb,
  note       text        not null default '',
  created_at timestamptz not null default now()
);

create index workout_sessions_user_date_idx
  on public.workout_sessions (user_id, trained_on desc, created_at desc);

-- 每人一列，填到一半還沒按儲存的那次
create table public.workout_drafts (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  draft      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ladder_state     enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_drafts   enable row level security;

-- auth.uid() 包成 (select auth.uid()) 是 Supabase 官方建議的寫法，
-- 這樣每次查詢只算一次，不會每一列都重算
create policy "自己的檔位可讀" on public.ladder_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "自己的檔位可寫" on public.ladder_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "自己的檔位可改" on public.ladder_state
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "自己的歷程可讀" on public.workout_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "自己的歷程可寫" on public.workout_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "自己的歷程可改" on public.workout_sessions
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "自己的歷程可刪" on public.workout_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "自己的草稿可讀" on public.workout_drafts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "自己的草稿可寫" on public.workout_drafts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "自己的草稿可改" on public.workout_drafts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "自己的草稿可刪" on public.workout_drafts
  for delete to authenticated using ((select auth.uid()) = user_id);
