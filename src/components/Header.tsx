import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onMenuToggle?: (isOpen: boolean) => void;
  hasBackground?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, hasBackground = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = 'mobile-menu';

  const toggleMenu = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    onMenuToggle?.(newState);
    
    // Focus management
    if (newState) {
      // Focus sur le premier élément du menu
      setTimeout(() => {
        const firstMenuItem = document.querySelector(`#${menuId} a`);
        if (firstMenuItem instanceof HTMLElement) {
          firstMenuItem.focus();
        }
      }, 100);
    }
  };

  // Gestion de la touche Escape
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
        onMenuToggle?.(false);
        // Remettre le focus sur le bouton menu
        const menuButton = document.querySelector('[aria-controls="mobile-menu"]');
        if (menuButton instanceof HTMLElement) {
          menuButton.focus();
        }
      }
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen, onMenuToggle]);
  return (
    <header className={`absolute top-0 left-0 right-0 z-50 ${hasBackground ? 'bg-brand-dark shadow-lg' : 'bg-transparent'}`} role="banner">
      <div className="container mx-auto max-w-6xl px-4 py-4 flex justify-between items-center">
        <div className="text-brand-white font-headline font-bold text-xl">
          <a href="/" className="hover:text-brand-accent transition-colors duration-300">
            Lettres de réserves en cas d'accident du travail
          </a>
        </div>
        
        {/* Burger Menu Button */}
        <button
          onClick={toggleMenu}
          className="text-brand-white hover:text-brand-accent transition-colors duration-300 p-2"
          aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-controls={menuId}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>
      
      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div 
          id={menuId}
          className="absolute top-full left-0 right-0 bg-brand-dark bg-opacity-95 backdrop-blur-sm border-t border-brand-accent border-opacity-30"
          role="region"
          aria-label="Menu de navigation mobile"
        >
          <nav className="container mx-auto max-w-6xl px-4 py-4" role="navigation" aria-label="Navigation principale">
            <ul className="space-y-4">
              <li>
                <a 
                  href="/validation" 
                  className="block text-brand-white hover:text-brand-accent focus:text-brand-accent transition-colors duration-300 font-body focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50 rounded px-2 py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Validation des données
                </a>
              </li>
              <li>
                <a 
                  href="/upload" 
                  className="block text-brand-white hover:text-brand-accent focus:text-brand-accent transition-colors duration-300 font-body focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50 rounded px-2 py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Téléverser un document
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="block text-brand-white hover:text-brand-accent focus:text-brand-accent transition-colors duration-300 font-body focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50 rounded px-2 py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;