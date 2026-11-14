create table public.crop (
    code text primary key check (code ~ '^[a-z0-9_]+$'),
    name text not null check (length(btrim(name)) > 0)
);

-- Mismos códigos que backend/app/data/crops.py. Solo identifica cultivos.
insert into public.crop (code, name) values
    ('maiz', 'Maíz'),
    ('frijol_caupi', 'Frijol caupí'),
    ('camote', 'Camote');

create table public.crop_cycle (
    id uuid primary key default gen_random_uuid(),
    plot_id uuid not null references public.plot(id) on delete cascade,
    crop_code text references public.crop(code) on delete restrict,
    sowing_date date,
    harvest_date date,
    status text not null check (status in ('active', 'finished', 'planned')),
    origin text not null default 'farmer' check (origin in ('farmer', 'recommendation')),
    created_at timestamptz not null default now(),
    constraint crop_cycle_required_fields check (
        (status = 'planned' and sowing_date is not null)
        or (status in ('active', 'finished') and crop_code is not null)
    ),
    constraint crop_cycle_dates_in_order check (
        harvest_date is null or sowing_date is null or harvest_date >= sowing_date
    )
);

create index crop_cycle_plot_status_idx on public.crop_cycle (plot_id, status);
create index crop_cycle_crop_code_idx on public.crop_cycle (crop_code);
create unique index crop_cycle_one_active_per_plot_idx
    on public.crop_cycle (plot_id) where status = 'active';
create unique index crop_cycle_one_planned_per_plot_idx
    on public.crop_cycle (plot_id) where status = 'planned';

alter table public.crop enable row level security;
alter table public.crop_cycle enable row level security;

revoke all on public.crop, public.crop_cycle from public, anon, authenticated;
