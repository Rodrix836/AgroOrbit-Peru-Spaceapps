create table public.app_user (
    id uuid primary key default gen_random_uuid(),
    auth_user_id uuid unique references auth.users(id) on delete set null,
    display_name text not null check (length(btrim(display_name)) > 0),
    created_at timestamptz not null default now()
);

create table public.plot (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.app_user(id) on delete cascade,
    name varchar(120) not null check (length(btrim(name)) > 0),
    latitude numeric(9, 6) not null check (latitude between -90 and 90),
    longitude numeric(9, 6) not null check (longitude between -180 and 180),
    area_ha numeric(12, 4) check (area_ha > 0),
    water_source text,
    water_availability text check (water_availability in ('low', 'medium', 'high')),
    soil_texture text,
    soil_ph numeric(4, 2) check (soil_ph between 0 and 14),
    soil_salinity_ds_m numeric(8, 3) check (soil_salinity_ds_m >= 0),
    priority text check (priority in (
        'save_water', 'improve_soil', 'reduce_climate_risk', 'diversify', 'maintain_productivity'
    )),
    declared_irrigated boolean,
    lgrip_class integer check (lgrip_class between 0 and 3),
    lgrip_year integer,
    created_at timestamptz not null default now()
);

create index plot_user_id_idx on public.plot (user_id);

create table public.device (
    id uuid primary key default gen_random_uuid(),
    plot_id uuid not null references public.plot(id) on delete cascade,
    external_id text not null unique check (length(btrim(external_id)) > 0),
    model text,
    status text not null default 'active' check (status in ('active', 'inactive')),
    secret_hash text unique,
    installed_at timestamptz,
    created_at timestamptz not null default now()
);

create index device_plot_id_idx on public.device (plot_id);

create table public.sensor_reading (
    id uuid primary key default gen_random_uuid(),
    device_id uuid not null references public.device(id) on delete cascade,
    observed_at timestamptz not null,
    variable text not null check (length(btrim(variable)) > 0),
    raw_value numeric(14, 5) not null,
    calibrated_value numeric(14, 5),
    unit text not null,
    quality_flag text,
    received_at timestamptz not null default now(),
    constraint sensor_reading_unique_value unique (device_id, variable, observed_at)
);

create index sensor_reading_device_time_idx on public.sensor_reading (device_id, observed_at desc);

alter table public.app_user enable row level security;
alter table public.plot enable row level security;
alter table public.device enable row level security;
alter table public.sensor_reading enable row level security;

revoke all on public.app_user, public.plot, public.device, public.sensor_reading
    from public, anon, authenticated;
