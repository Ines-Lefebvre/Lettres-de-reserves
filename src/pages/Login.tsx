import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Rediriger si déjà connecté
  useEffect(() => {
    const token = localStorage.getItem('n8n_auth_token');
    if (token) {
      navigate('/upload');
    }
  }, [navigate]);

  // Validation email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation mot de passe
  const isValidPassword = (password: string): boolean => {
    return password.length >= 6;
  };

  // Validation formulaire
  const validateForm = (): boolean => {
    if (!formData.email || !formData.password) {
      setError('Tous les champs sont obligatoires');
      return false;
    }

    if (!isValidEmail(formData.email)) {
      setError('Adresse email invalide');
      return false;
    }

    if (!isValidPassword(formData.password)) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    if (activeTab === 'register' && formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }

    return true;
  };

  // Gestion changement de champ
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setMessage('');
  };

  // Gestion soumission formulaire - CORRECTION CRITIQUE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      console.log('🚀 Envoi authentification:', {
        action: activeTab,
        email: formData.email,
        url: 'https://n8n.srv833062.hstgr.cloud/webhook/auth'
      });

      // ✅ APPEL CORRECT - JSON PUR
      const response = await fetch('https://n8n.srv833062.hstgr.cloud/webhook/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: activeTab, // 'login' ou 'register'
          email: formData.email,
          password: formData.password
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      console.log('📦 Response data:', result);

      // ✅ GESTION CORRECTE DE LA RÉPONSE N8N - Vérifier le champ "ok"
      if (result.ok === true) {
        // Succès
        if (activeTab === 'register') {
          // Inscription réussie - afficher message de succès
          setMessage('Inscription réussie !');
          console.log('✅ Inscription réussie pour:', formData.email);
          
          // Stocker le token si fourni
          if (result.token) {
            localStorage.setItem('n8n_auth_token', result.token);
            console.log('✅ Token stocké:', result.token);
          }
          
          // Redirection après un court délai
          setTimeout(() => {
            navigate('/upload');
          }, 1500);
        } else {
          // Connexion réussie - stocker token et rediriger
          if (result.token) {
            localStorage.setItem('n8n_auth_token', result.token);
            console.log('✅ Token stocké:', result.token);
            
            setMessage('Connexion réussie !');
            console.log('✅ Connexion réussie pour:', formData.email);
            
            // Redirection immédiate vers /upload
            setTimeout(() => {
              navigate('/upload');
            }, 1000);
          } else {
            setError('Token manquant dans la réponse');
          }
        }
      } else {
        // Échec - afficher le message d'erreur du backend
        console.log('❌ Erreur d\'authentification:', result.message);
        setError(result.message || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('❌ Erreur auth:', error);
      
      let userMessage = 'Erreur de connexion au serveur';
      if (error instanceof Error) {
        if (error.message === 'Failed to fetch') {
          userMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
        } else if (error.message.includes('HTTP error')) {
          userMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else {
          userMessage = error.message;
        }
      }
      
      setError(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Changement d'onglet
  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setError('');
    setMessage('');
    setFormData({
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="min-h-screen bg-brand-white">
      <Header hasBackground={true} />

      <main className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="container mx-auto max-w-md px-4">
          {/* Card principale */}
          <div className="bg-white rounded-lg shadow-xl border-2 border-brand-light p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <h1 className="font-headline text-2xl font-bold text-brand-text-dark mb-2">
                Espace Client
              </h1>
              <p className="text-gray-600 font-body">
                Accédez à vos services de lettres de réserves
              </p>
            </div>

            {/* Tabs */}
            <div className="flex mb-6 bg-brand-light bg-opacity-30 rounded-lg p-1">
              <button
                onClick={() => handleTabChange('login')}
                className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'login'
                    ? 'bg-brand-accent text-white shadow-md'
                    : 'text-brand-text-dark hover:bg-brand-light hover:bg-opacity-50'
                }`}
              >
                Connexion
              </button>
              <button
                onClick={() => handleTabChange('register')}
                className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'register'
                    ? 'bg-brand-accent text-white shadow-md'
                    : 'text-brand-text-dark hover:bg-brand-light hover:bg-opacity-50'
                }`}
              >
                Inscription
              </button>
            </div>

            {/* Messages */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {message && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-700 text-sm">{message}</span>
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-brand-text-dark mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                    placeholder="votre@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-brand-text-dark mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmation mot de passe (inscription uniquement) */}
              {activeTab === 'register' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-brand-text-dark mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Bouton de soumission */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-accent hover:bg-opacity-90 text-white py-3 rounded-lg font-headline font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {activeTab === 'login' ? 'Connexion...' : 'Inscription...'}
                  </div>
                ) : (
                  activeTab === 'login' ? 'Se connecter' : 'S\'inscrire'
                )}
              </button>
            </form>

            {/* Informations supplémentaires */}
            <div className="mt-6 text-center text-sm text-gray-600">
              {activeTab === 'login' ? (
                <p>
                  Pas encore de compte ?{' '}
                  <button
                    onClick={() => handleTabChange('register')}
                    className="text-brand-accent hover:text-brand-dark font-semibold"
                    disabled={isLoading}
                  >
                    Créer un compte
                  </button>
                </p>
              ) : (
                <p>
                  Déjà un compte ?{' '}
                  <button
                    onClick={() => handleTabChange('login')}
                    className="text-brand-accent hover:text-brand-dark font-semibold"
                    disabled={isLoading}
                  >
                    Se connecter
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Informations légales */}
          <div className="mt-6 bg-brand-light bg-opacity-50 rounded-lg p-4 text-center text-sm text-gray-700">
            <p className="mb-2">
              <strong>Sécurité et confidentialité</strong>
            </p>
            <p>
              Vos données sont chiffrées et protégées. Conformité RGPD garantie.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Login;