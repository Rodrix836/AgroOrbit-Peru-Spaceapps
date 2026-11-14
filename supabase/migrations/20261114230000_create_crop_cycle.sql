create table public.crop_cycle (
    id uuid primary key default gen_random_uuid(),
    plot_id uuid not null references public.plot(id) on delete cascade,
    crop_id text not null,
    start_on date not null,
    end_on date not null,
    status text not null default 'planned'
        check (status in ('planned', 'active', 'completed')),
    created_at timestamptz not null default now(),
    constraint crop_cycle_date_order check (start_on <= end_on)
);

create index crop_cycle_plot_dates_idx
    on public.crop_cycle (plot_id, start_on, end_on);

create unique index crop_cycle_one_active_per_plot_idx
    on public.crop_cycle (plot_id)
    where status = 'active';

alter table public.crop_cycle enable row level security;
revoke all on public.crop_cycle from public, anon, authenticated;
