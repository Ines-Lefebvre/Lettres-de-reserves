import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav('/upload');
    });
  }, [nav]);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    
    // Vérifier la configuration Supabase
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setMsg('Configuration Supabase manquante. Veuillez configurer les variables d\'environnement.');
      setLoading(false);
      return;
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg(`Erreur de connexion: ${error.message}`);
      setLoading(false);
      return;
    }
    // Redirection vers /upload après connexion réussie
    nav('/upload');
  };

  const signUp = async () => {
    setLoading(true);
    setMsg(null);
    
    // Vérifier la configuration Supabase
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setMsg('Configuration Supabase manquante. Veuillez configurer les variables d\'environnement.');
      setLoading(false);
      return;
    }
    
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMsg(`Erreur de création de compte: ${error.message}`);
    } else {
      setMsg('Compte créé. Connectez-vous.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-brand-white">
      <Header hasBackground={true} />
      
      <main className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto max-w-md px-4">
          <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-8">
            <h1 className="font-headline text-3xl font-bold text-brand-text-dark mb-6 text-center">
              Connexion
            </h1>
            
            <form onSubmit={signIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-accent hover:bg-opacity-90 text-white py-2 px-4 rounded-md font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button
                onClick={signUp}
                disabled={loading}
                className="text-brand-accent hover:text-brand-dark font-medium transition-colors duration-300 disabled:opacity-50"
              >
                Créer un compte
              </button>
            </div>
            
            {msg && (
              <div className={`mt-4 p-3 rounded-md text-sm ${
                msg.includes('Compte créé') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {msg}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}