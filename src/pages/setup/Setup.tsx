import { useEffect, useState } from 'react';
import { useUserAndTenant } from '../../hooks/useUserAndTenant';
import { supabase } from '../../lib/supabaseCleint';


export default function Setup() {
  const { loading, tenant } = useUserAndTenant();
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState('#ff1493');
  const [secondary, setSecondary] = useState('#ffffff');
  const [variant, setVariant] = useState<'light'|'dark'>('light');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || '');
      setPrimary(tenant.primary_color || '#ff1493');
      setSecondary(tenant.secondary_color || '#ffffff');
      setVariant(tenant.theme_variant || 'light');
    }
  }, [tenant]);

  if (loading) return <div className="p-5 text-center">Carregando...</div>;

  const save = async () => {
    setSaving(true);
    await supabase.from('tenants').update({
      name,
      primary_color: primary,
      secondary_color: secondary,
      theme_variant: variant,
      setup_complete: true
    }).eq('id', tenant.id);
    setSaving(false);
    window.location.href = '/dashboard';
  };

  return (
    <div className="container py-4">
      <h3>Configurar seu salão</h3>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Nome do salão</label>
          <input className="form-control" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label">Cor primária</label>
          <input type="color" className="form-control form-control-color" value={primary} onChange={e=>setPrimary(e.target.value)} />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label">Cor secundária</label>
          <input type="color" className="form-control form-control-color" value={secondary} onChange={e=>setSecondary(e.target.value)} />
        </div>
        <div className="col-12">
          <div className="btn-group" role="group">
            <button className={`btn ${variant==='light'?'btn-primary':'btn-outline-primary'}`} onClick={()=>setVariant('light')}>🌞 Light</button>
            <button className={`btn ${variant==='dark'?'btn-primary':'btn-outline-primary'}`} onClick={()=>setVariant('dark')}>🌙 Dark</button>
          </div>
        </div>
        <div className="col-12">
          <button className="btn btn-success" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar e continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
