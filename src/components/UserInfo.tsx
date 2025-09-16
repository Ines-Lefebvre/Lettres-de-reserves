import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { n8nApi } from '../utils/n8nApiClient';

const UserInfo: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState(n8nApi.getCurrentUser());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Gestion de la déconnexion
  const handleLogout = () => {
    n8nApi.logout();
    window.location.href = '/login';
  };

  // Obtenir les initiales de l'utilisateur
  const getUserInitials = (email: string): string => {
    return email.charAt(0).toUpperCase();
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton utilisateur */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 bg-brand-light bg-opacity-20 hover:bg-opacity-30 text-brand-white px-3 py-2 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50"
        aria-label="Menu utilisateur"
        aria-expanded={isDropdownOpen}
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-brand-accent rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {getUserInitials(user.email)}
          </span>
        </div>
        
        {/* Email (masqué sur mobile) */}
        <span className="hidden md:block text-sm font-medium truncate max-w-32">
          {user.email}
        </span>
        
        {/* Icône dropdown */}
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
          {/* Informations utilisateur */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-text-dark truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500">
                  ID: {user.id.substring(0, 8)}...
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInfo;