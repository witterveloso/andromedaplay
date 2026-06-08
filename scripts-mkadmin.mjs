import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await s.auth.admin.createUser({
  email: 'witterveloso@gmail.com',
  password: 'Wv#213500',
  email_confirm: true,
  user_metadata: { full_name: 'Witter Veloso' },
});
if (error) { console.error(error); process.exit(1); }
console.log('user', data.user.id);
const { error: e2 } = await s.from('user_roles').insert({ user_id: data.user.id, role: 'admin' });
if (e2) console.error('role error', e2); else console.log('admin role assigned');
