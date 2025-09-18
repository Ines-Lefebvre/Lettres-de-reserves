import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav('/upload');
    });
  }, [nav]);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(error.message);
    nav('/upload');
  };

  const signUp = async () => {
    setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setMsg(error.message);
    setMsg('Compte créé. Connectez-vous.');
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h1>Connexion</h1>
      <form onSubmit={signIn}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" required />
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" type="password" required />
        <button type="submit">Se connecter</button>
      </form>
      <button onClick={signUp} style={{ marginTop: 8 }}>Créer un compte</button>
      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}