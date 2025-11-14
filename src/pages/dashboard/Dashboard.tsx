import { useEffect, useState } from 'react';
import { getCurrentProfile } from '../../lib/supabaseCleint';
import DashboardGlobal from './DashboardGlobal';
import DashboardTenant from './DashboardTenant';


export default function Dashboard() {
  const [role, setRole] = useState<string | null>(null);
  const [_, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const profile = await getCurrentProfile();

      if (!profile) {
        console.error('Perfil não encontrado!');
        setRole(null);
      } else {
        setRole(profile.role); // superuser / manager / professional
      }

      setLoading(false);
    }

    fetchRole();
  }, []);




  if (role === 'superuser') {
    return <DashboardGlobal />;
  } else if (role === 'manager' || role === 'professional') {
    return <DashboardTenant />;
  } else {
    return (
      <>
     
        <p style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
          Acesso negado. Nenhum perfil compatível encontrado.
        </p>
      </>
    );
  }
}
