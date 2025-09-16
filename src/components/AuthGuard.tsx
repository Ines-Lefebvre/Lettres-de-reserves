import React, { useEffect, useState } from 'react';
import { n8nApi } from '../utils/n8nApiClient';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const isValid = n8nApi.isAuthenticated();
      setIsAuthenticated(isValid);
      
      if (!isValid) {
        // Redirection vers la page de connexion
        window.location.href = '/login';
      }
    };

    checkAuth();
  }, []);

  // Affichage pendant la vérification
  if (isAuthenticated === null) {
    return (
      fallback || (
        <div className="min-h-screen bg-brand-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent mx-auto mb-4"></div>
            <p className="text-brand-text-dark font-body">Vérification de l'authentification...</p>
          </div>
        </div>
      )
    );
  }

  // Si authentifié, afficher le contenu
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Si non authentifié, ne rien afficher (redirection en cours)
  return null;
};

export default AuthGuard;