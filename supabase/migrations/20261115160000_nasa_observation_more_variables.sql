-- NASA POWER: de 2 a 9 variables diarias en public.nasa_observation.
-- Solo amplía las restricciones: las filas T2M y PRECTOTCORR existentes siguen siendo válidas,
-- y la API actual (que solo guarda esas dos) sigue funcionando antes y después de aplicarla.
--
-- Nuevas variables (unidades tal como las declara POWER, community=AG, time-standard=LST):
--   T2M_MAX, T2M_MIN       C            temperatura máxima / mínima diaria a 2 m
--   RH2M                   %            humedad relativa a 2 m
--   WS2M                   m/s          velocidad del viento a 2 m
--   ALLSKY_SFC_SW_DWN      MJ/m^2/day   radiación solar de onda corta en superficie
--   GWETTOP, GWETROOT      1            humedad del suelo superficial / zona de raíces (fracción 0-1)
-- Las cinco primeras, con T2M, son las entradas de ETo FAO-56 (Penman-Monteith).
--
-- Numeric 'NaN' es mayor que cualquier número en PostgreSQL: los rangos con tope (<, <=) ya lo excluyen;
-- los que solo tienen mínimo lo excluyen explícitamente.

alter table public.nasa_observation
    drop constraint nasa_observation_variable_check,
    drop constraint nasa_observation_valid_measurement;

alter table public.nasa_observation
    add constraint nasa_observation_variable_check check (variable in (
        'T2M', 'PRECTOTCORR', 'T2M_MAX', 'T2M_MIN', 'RH2M', 'WS2M',
        'ALLSKY_SFC_SW_DWN', 'GWETTOP', 'GWETROOT'
    )),
    add constraint nasa_observation_valid_measurement check (
        (variable in ('T2M', 'T2M_MAX', 'T2M_MIN') and unit = 'C'
            and (value is null or value > -900 and value < 900))
        or (variable = 'PRECTOTCORR' and unit = 'mm/day'
            and (value is null or value >= 0 and value <> 'NaN'::numeric))
        or (variable = 'RH2M' and unit = '%'
            and (value is null or value >= 0 and value <= 100))
        or (variable = 'WS2M' and unit = 'm/s'
            and (value is null or value >= 0 and value <> 'NaN'::numeric))
        or (variable = 'ALLSKY_SFC_SW_DWN' and unit = 'MJ/m^2/day'
            and (value is null or value >= 0 and value <> 'NaN'::numeric))
        or (variable in ('GWETTOP', 'GWETROOT') and unit = '1'
            and (value is null or value >= 0 and value <= 1))
    );
