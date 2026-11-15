-- NASA POWER devuelve ambos índices de humedad del suelo con unidad '1'.
alter table public.nasa_observation
    drop constraint nasa_observation_variable_check,
    drop constraint nasa_observation_valid_measurement,
    add constraint nasa_observation_variable_check
        check (variable in ('T2M', 'PRECTOTCORR', 'GWETTOP', 'GWETROOT')),
    add constraint nasa_observation_valid_measurement check (
        (variable = 'T2M' and unit = 'C' and (value is null or value > -900 and value < 900))
        or (variable = 'PRECTOTCORR' and unit = 'mm/day'
            and (value is null or value >= 0 and value <> 'NaN'::numeric))
        or (variable in ('GWETTOP', 'GWETROOT') and unit = '1'
            and (value is null or value between 0 and 1))
    );
