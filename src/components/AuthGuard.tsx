import React, { useEffect, useState } from 'react';
import { authManager } from '../utils/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const isValid = authManager.isTokenValid();
      setIsAuthenticated(isValid);
      
      if (!isValid) {
        // Redirection gérée par authManager.requireAuth()
        authManager.requireAuth();
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