import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthGuard from '../components/AuthGuard';
import { supabase } from '../utils/supabaseClient';

export default function ValidationPage() {
  const [params] = useSearchParams();
  const rid = useMemo(() => params.get('rid') ?? '', [params]);
  const [payload, setPayload] = useState<any>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const cached = sessionStorage.getItem('ocr_payload');
    if (cached) setPayload(JSON.parse(cached));
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try { setPayload(JSON.parse(e.target.value)); }
    catch { /* ignore */ }
  };

  const onSave = async () => {
    setSaving(true); setMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/login'; return; }
    const { error } = await supabase.from('dossiers').insert({
      request_id: rid || null,
      user_id: session.user.id,
      payload
    });
    if (error) setMsg(error.message);
    else nav('/checkout');
    setSaving(false);
  };

  return (
    <AuthGuard>
      <div style={{ maxWidth: 840, margin: '40px auto' }}>
        <h1>Validation des données</h1>
        <textarea
          style={{ width: '100%', height: 260 }}
          defaultValue={JSON.stringify(payload, null, 2)}
          onChange={onChange}
        />
        <button onClick={onSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Valider'}</button>
        {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
      </div>
    </AuthGuard>
  );
}