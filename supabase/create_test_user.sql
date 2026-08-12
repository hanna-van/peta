-- =============================================================================
-- Skrip Pembuatan Akun Langsung (Bypass Email Rate Limit)
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor
-- =============================================================================

do $$
begin
  if not exists (select 1 from auth.users where email = 'hanna@orienteering.com') then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'hanna@orienteering.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Hanna"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
    set encrypted_password = crypt('password123', gen_salt('bf')),
        email_confirmed_at = now()
    where email = 'hanna@orienteering.com';
  end if;
end $$;
