// seed-users-and-links.js
// Usage:
// 1) npm i @supabase/supabase-js dotenv bcryptjs uuid
// 2) create a .env file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// 3) node seed-users-and-links.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltando SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function createAuthUser(email, password, full_name) {
  // Use admin API to create user with password
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name },
    email_confirm: true
  });

  if (error) {
    console.error('Erro ao criar usuário', email, error);
    throw error;
  }
  return data.user;
}

async function run() {
  try {
    console.log('Buscando tenants criados...');
    const { data: tenants, error: tErr } = await supabase.from('tenants').select('*').order('created_at', { ascending: true });
    if (tErr) throw tErr;
    if (!tenants || tenants.length < 3) {
      console.warn('Esperava 3 tenants. Verifique seed.sql foi executado antes.');
    }

    const managerEmails = ['gerente1@nailup.com', 'gerente2@nailup.com', 'gerente3@nailup.com'];
    const managerNames = ['Gerente NailUp', 'Gerente Beleza Pura', 'Gerente Rainha'];
    const password = '123'; // senha padrão

    const createdUsers = [];

    // Create managers
    for (let i = 0; i < 3; i++) {
      const email = managerEmails[i];
      const name = managerNames[i];
      console.log('Criando manager', email);
      const user = await createAuthUser(email, password, name);
      console.log('Criado', user.id);
      createdUsers.push({ role: 'manager', user });
    }

    // Professionals emails mapping (in same order as inserted in seed.sql)
    const pros = [
      { email: 'juliana.n1@example.com', name: 'Juliana Souza' },
      { email: 'vanessa.n1@example.com', name: 'Vanessa Lima' },
      { email: 'paula.n1@example.com', name: 'Paula Melo' },

      { email: 'amanda.n2@example.com', name: 'Amanda Costa' },
      { email: 'carla.n2@example.com', name: 'Carla Ferreira' },
      { email: 'luciana.n2@example.com', name: 'Luciana Alves' },

      { email: 'mariana.n3@example.com', name: 'Mariana Gomes' },
      { email: 'beatriz.n3@example.com', name: 'Beatriz Lima' },
      { email: 'patricia.n3@example.com', name: 'Patricia Santos' }
    ];

    for (let i = 0; i < pros.length; i++) {
      const p = pros[i];
      console.log('Criando professional user', p.email);
      const user = await createAuthUser(p.email, password, p.name);
      createdUsers.push({ role: 'professional', user });
    }

    // Now link created users to profiles and professionals
    // Fetch professionals rows to map them to created users
    const { data: professionalsRows } = await supabase.from('professionals').select('*').order('created_at', { ascending: true });
    const { data: profilesRows } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });

    // Update profiles: assign manager users to the 3 profile rows (order must match seed.sql)
    console.log('Atualizando profiles com user_ids de managers...');
    for (let i = 0; i < 3; i++) {
      const managerUser = createdUsers.find(u => u.role === 'manager' && createdUsers.indexOf(u) === i ? true : true);
      const profileRow = profilesRows[i];
      if (!profileRow) continue;
      const { error: upErr } = await supabase
        .from('profiles')
        .update({ user_id: createdUsers[i].user.id, full_name: createdUsers[i].user.user_metadata?.full_name || createdUsers[i].user.email })
        .eq('tenant_id', profileRow.tenant_id)
        .eq('role', profileRow.role);
      if (upErr) console.error('Erro atualizando profile', upErr);
    }

    // Update professionals: assign user_id to professionals rows in order
    console.log('Atualizando professionals com user_ids...');
    for (let i = 0; i < professionalsRows.length; i++) {
      const prof = professionalsRows[i];
      const created = createdUsers.find((c, idx) => c.role === 'professional' && createdUsers.filter(x => x.role === 'professional').indexOf(c) === (i) % 9);
      // Better mapping: map in order
      const professionalUser = createdUsers.filter(c => c.role === 'professional')[i];
      if (!professionalUser) continue;
      const { error: upProfErr } = await supabase
        .from('professionals')
        .update({ user_id: professionalUser.user.id })
        .eq('id', prof.id);
      if (upProfErr) console.error('Erro atualizando professional', upProfErr);
    }

    console.log('Seed de usuários e vinculações finalizada.');
    console.log('Managers criados (email / password = 123):', managerEmails);
    console.log('Professionals criados (email / password = 123):', pros.map(p=>p.email));
    console.log('Agora você pode usar esses e-mails e senha para login.');
  } catch (err) {
    console.error('Erro no seed script:', err);
  }
}

run();
