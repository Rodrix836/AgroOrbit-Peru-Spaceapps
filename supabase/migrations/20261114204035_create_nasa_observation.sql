create table public.nasa_observation (
    id uuid primary key default gen_random_uuid(),
    plot_id uuid not null references public.plot(id) on delete cascade,
    variable text not null check (variable in ('T2M', 'PRECTOTCORR')),
    observed_on date not null,
    value numeric(14, 5),
    unit text not null,
    source text not null default 'NASA POWER' check (source = 'NASA POWER'),
    time_standard text not null default 'LST' check (time_standard = 'LST'),
    latitude numeric(9, 6) not null check (latitude between -90 and 90),
    longitude numeric(9, 6) not null check (longitude between -180 and 180),
    fetched_at timestamptz not null default now(),
    constraint nasa_observation_plot_variable_date_key unique (plot_id, variable, observed_on),
    constraint nasa_observation_valid_measurement check (
        (variable = 'T2M' and unit = 'C' and (value is null or value > -900 and value < 900))
        or (variable = 'PRECTOTCORR' and unit = 'mm/day'
            and (value is null or value >= 0 and value <> 'NaN'::numeric))
    )
);

alter table public.nasa_observation enable row level security;
revoke all on public.nasa_observation from public, anon, authenticated;
