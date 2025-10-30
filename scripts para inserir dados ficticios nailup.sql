-- ========== 1) PLANS ==========
INSERT INTO public.plans (code, name, interval, price_cents, duration_days, professional_limit, is_active)
SELECT * FROM (VALUES
    ('trial', 'Trial Plan', 'trial', 0, 14, 1, true),
    ('basic', 'Basic Plan', 'month', 5000, 30, 3, true),
    ('premium', 'Premium Plan', 'month', 12000, 30, 10, true)
) AS v(code, name, interval, price_cents, duration_days, professional_limit, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.plans p WHERE p.code = v.code);

-- ========== 2) TENANTS ==========
INSERT INTO public.tenants (name, plan_id, setup_complete, theme_variant, primary_color, secondary_color)
SELECT v.name, p.id, true, 'light', '#ff7a18', '#ffffff'
FROM (VALUES
    ('Salão NailUp! Glamour','trial'),
    ('Esmalteria Beleza Pura','basic'),
    ('Rainha das Unhas','premium')
) AS v(name, plan_code)
JOIN public.plans p ON p.code = v.plan_code
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.name = v.name);

-- ========== 3) PROFILES ==========
INSERT INTO public.profiles (user_id, tenant_id, role, full_name)
SELECT u.id, t.id, 'manager', COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
FROM auth.users u
JOIN public.tenants t ON (
  (u.email = 'gerente1@nailup.com' AND t.name = 'Salão NailUp! Glamour') OR
  (u.email = 'gerente2@nailup.com' AND t.name = 'Esmalteria Beleza Pura') OR
  (u.email = 'gerente3@nailup.com' AND t.name = 'Rainha das Unhas')
)
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);
-- final parte 1
-- ========== 4) PROFESSIONALS ==========
INSERT INTO public.professionals (tenant_id, user_id, name, phone, email, is_active)
SELECT
  CASE
    WHEN u.email IN ('paula.n1@example.com', 'juliana.n1@example.com', 'vanessa.n1@example.com') THEN t1.id
    WHEN u.email IN ('carla.n2@example.com', 'luciana.n2@example.com', 'amanda.n2@example.com') THEN t2.id
    WHEN u.email IN ('patricia.n3@example.com', 'mariana.n3@example.com', 'beatriz.n3@example.com') THEN t3.id
    ELSE t1.id
  END AS tenant_id,
  u.id,
  split_part(u.email, '@', 1) AS name,
  NULL AS phone,
  u.email,
  true
FROM auth.users u
CROSS JOIN (SELECT id FROM public.tenants WHERE name='Salão NailUp! Glamour' LIMIT 1) t1
CROSS JOIN (SELECT id FROM public.tenants WHERE name='Esmalteria Beleza Pura' LIMIT 1) t2
CROSS JOIN (SELECT id FROM public.tenants WHERE name='Rainha das Unhas' LIMIT 1) t3
WHERE u.email IN (
  'carla.n2@example.com','amanda.n2@example.com','patricia.n3@example.com',
  'mariana.n3@example.com','paula.n1@example.com','juliana.n1@example.com',
  'vanessa.n1@example.com','luciana.n2@example.com','beatriz.n3@example.com'
)
AND NOT EXISTS (SELECT 1 FROM public.professionals p WHERE p.user_id = u.id);

-- ========== 5) SERVICES ==========
INSERT INTO public.services (tenant_id, name, description, price_cents, duration_min, is_active)
SELECT t.id, svc.name, svc.description, svc.price_cents, svc.duration_min, true
FROM public.tenants t
CROSS JOIN LATERAL (
  VALUES
    ('Manicure', 'Manicure completa com esmaltação', 3000, 45),
    ('Pedicure', 'Pedicure com esfoliação', 4000, 60),
    ('Design de Sobrancelha', 'Design e correção', 2500, 30),
    ('Alongamento de Unhas', 'Alongamento em gel ou acrílico', 8000, 90)
) AS svc(name, description, price_cents, duration_min)
WHERE NOT EXISTS (SELECT 1 FROM public.services s WHERE s.tenant_id = t.id AND s.name = svc.name);

-- ========== 6) SUBSCRIPTIONS ==========
INSERT INTO public.subscriptions (tenant_id, plan_id, status, current_period_start_at, current_period_end_at, created_at)
SELECT t.id, t.plan_id, 'active',
       (now() AT TIME ZONE 'America/Sao_Paulo'),
       (now() AT TIME ZONE 'America/Sao_Paulo') + interval '30 days',
       (now() AT TIME ZONE 'America/Sao_Paulo')
FROM public.tenants t
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.tenant_id = t.id);
--final parte 2

-- ========== 7) APPOINTMENTS ==========
-- Cria 3 agendamentos fictícios para cada tenant, com horários aleatórios entre 08h e 18h (horário do Brasil)

INSERT INTO public.appointments
  (tenant_id, professional_id, service_id, customer_name, customer_phone, starts_at, ends_at, status, notes, created_via, created_at)
SELECT
  t.id AS tenant_id,
  p.id AS professional_id,
  s.id AS service_id,
  'Cliente Exemplo ' || t_row.row_num AS customer_name,
  '(11) 9' || lpad((10 + t_row.row_num)::text, 8, '0') AS customer_phone,
  ts AS starts_at,
  ts + (s.duration_min || ' minutes')::interval AS ends_at,
  'scheduled' AS status,
  'Agendamento de teste gerado automaticamente' AS notes,
  'app' AS created_via,
  now() AT TIME ZONE 'America/Sao_Paulo' AS created_at
FROM (
  SELECT 1 AS row_num UNION ALL
  SELECT 2 UNION ALL
  SELECT 3
) t_row
CROSS JOIN public.tenants t
-- pega um professional do tenant
LEFT JOIN LATERAL (
  SELECT id FROM public.professionals p WHERE p.tenant_id = t.id LIMIT 1
) p ON true
-- pega um serviço do tenant
LEFT JOIN LATERAL (
  SELECT id, duration_min FROM public.services s WHERE s.tenant_id = t.id LIMIT 1
) s ON true
-- gera horários aleatórios entre 08:00 e 18:00
CROSS JOIN LATERAL (
  SELECT 
    (
      date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') 
      + ((8 + floor(random() * 10)) || ' hours')::interval 
      + ((floor(random() * 60)) || ' minutes')::interval
    ) AS ts
) rand
WHERE p.id IS NOT NULL AND s.id IS NOT NULL;



-- ========== 8) PERMISSIONS ==========
-- Concede permissões extras aos gerentes

INSERT INTO public.permissions (tenant_id, user_id, permission_key, allowed)
SELECT t.id, u.id, perm.permission_key, true
FROM public.tenants t
JOIN auth.users u ON (
  (u.email = 'gerente1@nailup.com' AND t.name = 'Salão NailUp! Glamour') OR
  (u.email = 'gerente2@nailup.com' AND t.name = 'Esmalteria Beleza Pura') OR
  (u.email = 'gerente3@nailup.com' AND t.name = 'Rainha das Unhas')
)
CROSS JOIN (
  VALUES 
    ('appointments.create'),
    ('appointments.cancel'),
    ('services.manage'),
    ('tenants.edit')
) AS perm(permission_key)
ON CONFLICT DO NOTHING;
--- final parte 3 