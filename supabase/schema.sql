begin;

-- Keep these columns compatible with the original LoveShare navigation table.
create table if not exists public.navigation (
  id bigserial primary key,
  created_at timestamp without time zone default now(),
  title varchar,
  abstract varchar,
  article varchar,
  img varchar,
  to_link text,
  obj text,
  to_article boolean default false,
  slug uuid default gen_random_uuid()
);

alter table public.navigation
  add column if not exists article varchar,
  add column if not exists to_article boolean default false,
  add column if not exists slug uuid default gen_random_uuid(),
  add column if not exists is_published boolean not null default true,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists sort_order integer not null default 0;

alter table public.navigation alter column slug set default gen_random_uuid();
update public.navigation set slug = gen_random_uuid() where slug is null;
update public.navigation set obj = nullif(btrim(obj), '')
where obj is distinct from nullif(btrim(obj), '');

create table if not exists public.navigation_categories (
  name text primary key check (name <> '' and name = btrim(name)),
  sort_order integer not null default 0,
  default_view text check (default_view in ('cards', 'list', 'table'))
);

insert into public.navigation_categories (name)
select distinct obj from public.navigation where obj is not null
on conflict (name) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.navigation'::regclass and conname = 'navigation_category_fk'
  ) then
    alter table public.navigation
      add constraint navigation_category_fk
      foreign key (obj) references public.navigation_categories (name)
      on update cascade on delete set null;
  end if;
end;
$$;

create table if not exists public.navigation_settings (
  id smallint primary key default 1 check (id = 1),
  site_title text not null default 'LoveShare 导航' check (char_length(btrim(site_title)) between 1 and 60),
  site_description text not null default '把常用网站、实用工具与学习资源放在一起。'
    check (char_length(site_description) <= 240),
  default_view text not null default 'cards' check (default_view in ('cards', 'list', 'table')),
  enabled_views text[] not null default array['cards', 'list', 'table']
    check (
      cardinality(enabled_views) between 1 and 3
      and enabled_views <@ array['cards', 'list', 'table']
      and array_position(enabled_views, null) is null
      and default_view = any(enabled_views)
    ),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  category_display text not null default 'sidebar' check (category_display in ('sidebar', 'top', 'hidden')),
  show_icons boolean not null default true,
  show_description boolean not null default true,
  show_domain boolean not null default true,
  open_in_new_tab boolean not null default true,
  page_size integer not null default 24 check (page_size in (12, 24, 36, 60))
);

insert into public.navigation_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.navigation_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create index if not exists navigation_public_order_idx
  on public.navigation (is_pinned desc, sort_order, id desc) where is_published;
create index if not exists navigation_public_category_order_idx
  on public.navigation ((coalesce(obj, '')), is_pinned desc, sort_order, id desc) where is_published;
create index if not exists navigation_category_idx on public.navigation (obj);
create index if not exists navigation_note_slug_idx
  on public.navigation (slug) where is_published and to_article is true;

alter table public.navigation enable row level security;
alter table public.navigation_categories enable row level security;
alter table public.navigation_settings enable row level security;
alter table public.navigation_admins enable row level security;

-- Replace older policies on these four application tables with the current access model.
do $$
declare
  item record;
  id_sequence text;
begin
  for item in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('navigation', 'navigation_categories', 'navigation_settings', 'navigation_admins')
  loop
    execute format('drop policy %I on public.%I', item.policyname, item.tablename);
  end loop;

  if to_regclass('public.navigation_obj') is not null then
    execute 'revoke all on public.navigation_obj from public, anon, authenticated';
  end if;

  id_sequence := pg_get_serial_sequence('public.navigation', 'id');
  if id_sequence is not null then
    execute format('revoke all on sequence %s from public, anon, authenticated', id_sequence);
    execute format('grant usage on sequence %s to authenticated', id_sequence);
  end if;
end;
$$;

revoke all on public.navigation, public.navigation_categories, public.navigation_settings,
  public.navigation_admins from public, anon, authenticated;
grant select on public.navigation, public.navigation_categories, public.navigation_settings to anon, authenticated;
grant insert, update, delete on public.navigation, public.navigation_categories to authenticated;
grant update on public.navigation_settings to authenticated;
grant select on public.navigation_admins to authenticated;

create policy navigation_admin_read_self on public.navigation_admins
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.navigation_is_admin()
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.navigation_admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.navigation_is_admin() from public, anon, authenticated;
grant execute on function public.navigation_is_admin() to authenticated;

create policy navigation_public_read on public.navigation
  for select to anon, authenticated using (is_published);
create policy navigation_admin_manage on public.navigation
  for all to authenticated
  using ((select public.navigation_is_admin()))
  with check ((select public.navigation_is_admin()));

create policy navigation_categories_public_read on public.navigation_categories
  for select to anon, authenticated using (
    exists (select 1 from public.navigation as n where n.obj = name and n.is_published)
  );
create policy navigation_categories_admin_manage on public.navigation_categories
  for all to authenticated
  using ((select public.navigation_is_admin()))
  with check ((select public.navigation_is_admin()));

create policy navigation_settings_public_read on public.navigation_settings
  for select to anon, authenticated using (true);
create policy navigation_settings_admin_update on public.navigation_settings
  for update to authenticated
  using ((select public.navigation_is_admin()))
  with check ((select public.navigation_is_admin()));

create or replace function public.navigation_page(
  p_query text default '',
  p_category text default null,
  p_page integer default 1
)
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  settings public.navigation_settings;
  term text := lower(left(btrim(coalesce(p_query, '')), 100));
  category_list jsonb;
  total_count bigint;
  matching_count bigint;
  current_page integer;
  links jsonb;
begin
  select * into strict settings from public.navigation_settings where id = 1;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.sort_order, c.name), '[]'::jsonb),
    coalesce(sum(c.count), 0)
  into category_list, total_count
  from (
    select coalesce(n.obj, '') as name, coalesce(c.sort_order, 2147483647) as sort_order,
      c.default_view, count(*) as count
    from public.navigation n
    left join public.navigation_categories c on c.name = n.obj
    where n.is_published
    group by n.obj, c.sort_order, c.default_view
  ) c;

  if term = '' and p_category is null then
    matching_count := total_count;
  elsif term = '' then
    select coalesce((entry->>'count')::bigint, 0) into matching_count
    from jsonb_array_elements(category_list) entry where entry->>'name' = p_category;
    matching_count := coalesce(matching_count, 0);
  else
    select count(*) into matching_count
    from public.navigation n
    where n.is_published
      and (p_category is null or coalesce(n.obj, '') = p_category)
      and strpos(lower(concat_ws(chr(31), n.title, n.abstract, n.to_link, n.obj)), term) > 0;
  end if;

  current_page := greatest(1, least(coalesce(p_page, 1), (matching_count + settings.page_size - 1) / settings.page_size));

  select coalesce(
    jsonb_agg(to_jsonb(page_link) - 'sort_order' order by page_link.is_pinned desc, page_link.sort_order, page_link.id desc),
    '[]'::jsonb
  ) into links
  from (
    select n.id, n.title, n.abstract, n.img, n.to_link, n.obj, n.to_article, n.slug, n.is_pinned, n.sort_order
    from public.navigation n
    where n.is_published
      and (p_category is null or coalesce(n.obj, '') = p_category)
      and (term = '' or strpos(lower(concat_ws(chr(31), n.title, n.abstract, n.to_link, n.obj)), term) > 0)
    order by n.is_pinned desc, n.sort_order, n.id desc
    limit settings.page_size offset (current_page - 1)::bigint * settings.page_size
  ) page_link;

  return jsonb_build_object(
    'settings', to_jsonb(settings) - 'id',
    'categories', category_list,
    'links', links,
    'all_count', total_count,
    'count', matching_count,
    'page', current_page
  );
end;
$$;

create or replace function public.navigation_note(p_slug uuid)
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'title', n.title, 'abstract', n.abstract, 'img', n.img,
    'to_link', n.to_link, 'obj', n.obj, 'article', n.article,
    'site_title', s.site_title, 'theme', s.theme, 'open_in_new_tab', s.open_in_new_tab
  )
  from public.navigation n
  cross join public.navigation_settings s
  where n.slug = p_slug and n.is_published and n.to_article is true
  order by n.id desc
  limit 1;
$$;

revoke all on function public.navigation_page(text, text, integer), public.navigation_note(uuid)
  from public, anon, authenticated;
grant execute on function public.navigation_page(text, text, integer), public.navigation_note(uuid)
  to anon, authenticated;

notify pgrst, 'reload schema';
commit;
