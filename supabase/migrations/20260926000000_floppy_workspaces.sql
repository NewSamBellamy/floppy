-- Workspace-ready data model for the next Floppy iteration.
-- The current client still uses floppy_collections while the account path is
-- being verified. These tables are additive and are not read by the preview
-- until the project/version migration is implemented.

create table if not exists public.floppy_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.floppy_workspace_members (
  workspace_id uuid not null references public.floppy_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create or replace function public.floppy_is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.floppy_workspaces
     where id = target_workspace
       and owner_id = (select auth.uid())
  ) or exists (
    select 1
      from public.floppy_workspace_members
     where workspace_id = target_workspace
       and user_id = (select auth.uid())
  );
$$;

create or replace function public.floppy_is_workspace_editor(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.floppy_workspaces
     where id = target_workspace
       and owner_id = (select auth.uid())
  ) or exists (
    select 1
      from public.floppy_workspace_members
     where workspace_id = target_workspace
       and user_id = (select auth.uid())
       and role in ('owner', 'editor')
  );
$$;

create or replace function public.floppy_is_workspace_owner(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.floppy_workspaces
     where id = target_workspace
       and owner_id = (select auth.uid())
  );
$$;

alter table public.floppy_workspaces enable row level security;
alter table public.floppy_workspace_members enable row level security;

revoke all on public.floppy_workspaces from anon, authenticated;
revoke all on public.floppy_workspace_members from anon, authenticated;
grant select, insert, update, delete on public.floppy_workspaces to authenticated;
grant select, insert, update, delete on public.floppy_workspace_members to authenticated;

create policy "workspace members can read workspaces"
  on public.floppy_workspaces for select to authenticated
  using (owner_id = (select auth.uid()) or public.floppy_is_workspace_member(id));

create policy "users can create owned workspaces"
  on public.floppy_workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "owners can update workspaces"
  on public.floppy_workspaces for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "owners can delete workspaces"
  on public.floppy_workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "workspace members can read membership"
  on public.floppy_workspace_members for select to authenticated
  using (user_id = (select auth.uid()) or public.floppy_is_workspace_member(workspace_id));

create policy "owners can add members"
  on public.floppy_workspace_members for insert to authenticated
  with check (public.floppy_is_workspace_owner(workspace_id));

create policy "owners can change members"
  on public.floppy_workspace_members for update to authenticated
  using (public.floppy_is_workspace_owner(workspace_id))
  with check (public.floppy_is_workspace_owner(workspace_id));

create policy "owners can remove members"
  on public.floppy_workspace_members for delete to authenticated
  using (public.floppy_is_workspace_owner(workspace_id));

create table if not exists public.floppy_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.floppy_workspaces(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  snapshot jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.floppy_project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.floppy_projects(id) on delete cascade,
  version bigint not null check (version > 0),
  snapshot jsonb not null,
  change_summary text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

alter table public.floppy_projects enable row level security;
alter table public.floppy_project_versions enable row level security;

revoke all on public.floppy_projects from anon, authenticated;
revoke all on public.floppy_project_versions from anon, authenticated;
grant select, insert, update, delete on public.floppy_projects to authenticated;
grant select, insert on public.floppy_project_versions to authenticated;

create policy "members can read projects"
  on public.floppy_projects for select to authenticated
  using (public.floppy_is_workspace_member(workspace_id));

create policy "editors can create projects"
  on public.floppy_projects for insert to authenticated
  with check (public.floppy_is_workspace_editor(workspace_id) and created_by = (select auth.uid()));

create policy "editors can update projects"
  on public.floppy_projects for update to authenticated
  using (public.floppy_is_workspace_editor(workspace_id))
  with check (public.floppy_is_workspace_editor(workspace_id));

create policy "editors can delete projects"
  on public.floppy_projects for delete to authenticated
  using (public.floppy_is_workspace_editor(workspace_id));

create policy "members can read project history"
  on public.floppy_project_versions for select to authenticated
  using (exists (
    select 1 from public.floppy_projects project
     where project.id = project_id
       and public.floppy_is_workspace_member(project.workspace_id)
  ));

create policy "editors can append project history"
  on public.floppy_project_versions for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (
    select 1 from public.floppy_projects project
     where project.id = project_id
       and public.floppy_is_workspace_editor(project.workspace_id)
  ));

revoke all on function public.floppy_is_workspace_member(uuid) from public, anon;
revoke all on function public.floppy_is_workspace_editor(uuid) from public, anon;
revoke all on function public.floppy_is_workspace_owner(uuid) from public, anon;
grant execute on function public.floppy_is_workspace_member(uuid) to authenticated;
grant execute on function public.floppy_is_workspace_editor(uuid) to authenticated;
grant execute on function public.floppy_is_workspace_owner(uuid) to authenticated;
