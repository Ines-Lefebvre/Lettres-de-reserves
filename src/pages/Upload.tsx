import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthGuard from '../components/AuthGuard';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const url = import.meta.env.VITE_N8N_UPLOAD_URL as string;

  const onSend = async () => {
    if (!file) return setMsg('PDF requis');
    setMsg(null); setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('requestId', crypto.randomUUID());
    try {
      const res = await fetch(url, { method: 'POST', body: fd, mode: 'cors', credentials: 'omit' });
      const data = await res.json(); // { ok, requestId, next, payload? }
      if (data?.ok && data?.next) return nav(data.next);
      setMsg('Réponse inattendue du serveur.');
    } catch (e:any) {
      setMsg(e?.message ?? 'Échec réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div style={{ maxWidth: 640, margin: '40px auto' }}>
        <h1>Téléversement</h1>
        <input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0] ?? null)} />
        <button onClick={onSend} disabled={loading}>{loading ? 'Envoi…' : 'Envoyer'}</button>
        {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
      </div>
    </AuthGuard>
  );
}