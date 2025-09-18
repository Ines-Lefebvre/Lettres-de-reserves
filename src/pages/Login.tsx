import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Login() {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const navigate = useNavigate();

  // Vérifier si déjà connecté
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate('/upload');
      }
    });
  }, [navigate]);

  function resetAlerts() {
    setErrorMsg(null);
    setInfoMsg(null);
    setNeedsEmailConfirmation(false);
  }

  function getCredentials() {
    const email = emailRef.current?.value.trim() || '';
    const password = passwordRef.current?.value || '';
    return { email, password };
  }

  function validateInputs(email: string, password: string) {
    if (!email || !password) {
      throw new Error('Veuillez saisir un email et un mot de passe.');
    }
    if (password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
    }
  }

  // Mapping d'erreurs Supabase -> messages FR lisibles
  function mapSupabaseErrorMessage(message: string) {
    const msg = message?.toLowerCase() || '';

    if (msg.includes('email not confirmed')) {
      setNeedsEmailConfirmation(true);
      return 'Email non confirmé. Vérifiez votre boîte mail puis réessayez.';
    }
    if (msg.includes('invalid login credentials')) {
      return 'Identifiants invalides. Vérifiez votre email et votre mot de passe.';
    }
    if (msg.includes('anonymous sign-ins are disabled')) {
      return 'Veuillez renseigner un email et un mot de passe.';
    }
    if (msg.includes('user already registered')) {
      return 'Un compte existe déjà avec cet email.';
    }
    return message || 'Une erreur inattendue est survenue.';
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    resetAlerts();
    const { email, password } = getCredentials();

    try {
      validateInputs(email, password);
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(mapSupabaseErrorMessage(error.message));
        return;
      }

      // Succès
      navigate('/upload');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur de validation du formulaire.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    resetAlerts();
    const { email, password } = getCredentials();

    try {
      validateInputs(email, password);
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Si confirmation email activée côté Supabase (recommandé en prod) :
        options: { emailRedirectTo: `${import.meta.env.VITE_SITE_URL}/login` },
      });

      if (error) {
        setErrorMsg(mapSupabaseErrorMessage(error.message));
        return;
      }

      // Si confirmation requise, informer l'utilisateur
      setInfoMsg('Compte créé. Vérifiez votre email pour confirmer votre adresse, puis connectez-vous.');
      setNeedsEmailConfirmation(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur de validation du formulaire.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    resetAlerts();
    const email = emailRef.current?.value.trim() || '';
    if (!email) {
      setErrorMsg('Saisissez votre email pour renvoyer le lien de confirmation.');
      return;
    }
    try {
      setLoading(true);
      // Supabase JS v2 — renvoi de l'email de confirmation
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        setErrorMsg(mapSupabaseErrorMessage(error.message));
        return;
      }
      setInfoMsg('Email de confirmation renvoyé. Vérifiez votre boîte mail.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de renvoyer l\'email pour le moment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-white">
      <Header hasBackground={true} />
      
      <main className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto max-w-md px-4">
          <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-8">
            <h1 className="font-headline text-3xl font-bold text-brand-text-dark mb-6 text-center">
              Connexion
            </h1>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
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
                  ref={passwordRef}
                  id="password"
                  type="password"
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
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleSignup}
                disabled={loading}
                className="text-brand-accent hover:text-brand-dark font-medium transition-colors duration-300 disabled:opacity-50"
              >
                Créer un compte
              </button>
            </div>

            {needsEmailConfirmation && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  className="text-sm text-gray-600 hover:text-brand-accent font-medium transition-colors duration-300 disabled:opacity-50"
                >
                  Renvoyer l'email de confirmation
                </button>
              </div>
            )}
            
            {errorMsg && (
              <div className="mt-4 p-3 rounded-md text-sm bg-red-50 text-red-700 border border-red-200">
                <strong>Erreur :</strong> {errorMsg}
              </div>
            )}

            {infoMsg && (
              <div className="mt-4 p-3 rounded-md text-sm bg-blue-50 text-blue-700 border border-blue-200">
                {infoMsg}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}