-- WALKIYA TV core schema. Run in Supabase SQL editor or `supabase db push`.
create type app_role as enum ('super_admin','editor','journalist','media_manager','ad_manager');
create type article_status as enum ('draft','submitted','under_review','approved','published');
create type lang_code as enum ('ha','en');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '', role app_role not null default 'journalist',
  bio text, avatar_url text, created_at timestamptz not null default now());

create table categories (
  id uuid primary key default gen_random_uuid(), slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  name_ha text not null, name_en text not null, sort_order int not null default 0);

create table tags (id uuid primary key default gen_random_uuid(), slug text unique not null, name_ha text, name_en text);

create table articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id), category_id uuid references categories(id),
  status article_status not null default 'draft',
  is_breaking boolean not null default false, is_featured boolean not null default false,
  featured_image_url text, image_credit text,
  scheduled_at timestamptz, published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index on articles (status, published_at desc);
create index on articles (author_id);
create index on articles (category_id);

-- One article row, up to two linked translations (ha + en) = connected versions.
create table article_translations (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  lang lang_code not null, title text not null check (char_length(title) between 3 and 250),
  slug text not null check (slug ~ '^[a-z0-9-]+$'), excerpt text, body text not null default '',
  seo_title text, seo_description text check (char_length(seo_description) <= 320),
  unique (article_id, lang), unique (lang, slug));

create table article_tags (
  article_id uuid references articles(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade, primary key (article_id, tag_id));

create table activity_logs (
  id bigserial primary key, actor_id uuid references profiles(id), action text not null,
  entity text not null, entity_id text, details jsonb, created_at timestamptz not null default now());

-- Helpers
create function current_app_role() returns app_role language sql stable security definer set search_path = public
as $$ select role from profiles where id = auth.uid() $$;
create function is_editor() returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(current_app_role() in ('super_admin','editor'), false) $$;

-- New auth users get a journalist profile (never self-chosen role)
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name','')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Block role self-escalation: only super_admin may change roles
create function guard_profile_role() returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if new.role <> old.role and coalesce(current_app_role(),'journalist') <> 'super_admin' then
    raise exception 'Only a super admin can change roles'; end if;
  return new; end $$;
create trigger trg_guard_role before update on profiles for each row execute function guard_profile_role();

-- Editorial workflow enforced in the database
create function enforce_workflow() returns trigger language plpgsql security definer set search_path = public
as $$ begin
  new.updated_at := now();
  if tg_op = 'INSERT' and new.status <> 'draft' and not is_editor() then
    raise exception 'New articles must start as drafts'; end if;
  if tg_op = 'UPDATE' and new.status <> old.status and not is_editor() then
    if not (old.status = 'draft' and new.status = 'submitted') then
      raise exception 'Not authorised to move article from % to %', old.status, new.status; end if;
  end if;
  if tg_op = 'UPDATE' and not is_editor() and (new.is_breaking <> old.is_breaking or new.is_featured <> old.is_featured) then
    raise exception 'Only editors can flag breaking or featured news'; end if;
  if new.status = 'published' and new.published_at is null then new.published_at := coalesce(new.scheduled_at, now()); end if;
  return new; end $$;
create trigger trg_workflow before insert or update on articles for each row execute function enforce_workflow();

-- Audit log
create function log_change() returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into activity_logs(actor_id, action, entity, entity_id, details)
  values (auth.uid(), tg_op, tg_table_name, coalesce(new.id, old.id)::text, jsonb_build_object('status', to_jsonb(new)->>'status'));
  return coalesce(new, old); end $$;
create trigger audit_articles after insert or update or delete on articles for each row execute function log_change();
create trigger audit_profiles after update or delete on profiles for each row execute function log_change();

-- Row Level Security
alter table profiles enable row level security; alter table categories enable row level security;
alter table tags enable row level security; alter table articles enable row level security;
alter table article_translations enable row level security; alter table article_tags enable row level security;
alter table activity_logs enable row level security;

create policy "profiles read" on profiles for select using (true);
create policy "own profile update" on profiles for update using (id = auth.uid() or current_app_role() = 'super_admin');
create policy "categories read" on categories for select using (true);
create policy "categories manage" on categories for all using (is_editor()) with check (is_editor());
create policy "tags read" on tags for select using (true);
create policy "tags manage" on tags for all using (is_editor()) with check (is_editor());

create policy "articles public read" on articles for select
  using (status = 'published' and published_at <= now());
create policy "articles staff read" on articles for select using (author_id = auth.uid() or is_editor());
create policy "articles insert" on articles for insert with check (author_id = auth.uid() and current_app_role() in ('super_admin','editor','journalist'));
create policy "articles update" on articles for update
  using (is_editor() or (author_id = auth.uid() and status in ('draft','submitted')));
create policy "articles delete" on articles for delete using (is_editor());

create policy "translations public read" on article_translations for select
  using (exists (select 1 from articles a where a.id = article_id and a.status='published' and a.published_at <= now()));
create policy "translations staff" on article_translations for all
  using (exists (select 1 from articles a where a.id = article_id and (is_editor() or (a.author_id = auth.uid() and a.status in ('draft','submitted')))))
  with check (exists (select 1 from articles a where a.id = article_id and (is_editor() or (a.author_id = auth.uid() and a.status in ('draft','submitted')))));
create policy "article_tags read" on article_tags for select using (true);
create policy "article_tags staff" on article_tags for all
  using (exists (select 1 from articles a where a.id = article_id and (is_editor() or a.author_id = auth.uid())))
  with check (exists (select 1 from articles a where a.id = article_id and (is_editor() or a.author_id = auth.uid())));
create policy "logs read" on activity_logs for select using (current_app_role() = 'super_admin');

-- Public read view used by the homepage (RLS of underlying tables still applies)
create view published_stories with (security_invoker = true) as
  select a.id, t.lang, t.title, t.slug, t.excerpt, a.is_breaking, a.is_featured, a.featured_image_url, a.published_at, a.category_id
  from articles a join article_translations t on t.article_id = a.id;

insert into categories (slug,name_ha,name_en,sort_order) values
 ('politics','Siyasa','Politics',1),('business','Kasuwanci','Business',2),('sports','Wasanni','Sports',3),
 ('entertainment','Nishaɗi','Entertainment',4),('technology','Fasaha','Technology',5),('education','Ilimi','Education',6),
 ('security','Tsaro','Security',7),('international','Ƙasashen Waje','International',8);
