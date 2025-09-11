import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onMenuToggle?: (isOpen: boolean) => void;
}

interface HeaderProps {
  onMenuToggle?: (isOpen: boolean) => void;
  hasBackground?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, hasBackground = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    onMenuToggle?.(newState);
  };

  return (
    <header className={`absolute top-0 left-0 right-0 z-50 ${hasBackground ? 'bg-brand-dark shadow-lg' : 'bg-transparent'}`}>
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
          aria-label="Menu"
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
        <div className="absolute top-full left-0 right-0 bg-brand-dark bg-opacity-90 backdrop-blur-sm border-t border-brand-accent border-opacity-30">
          <nav className="container mx-auto max-w-6xl px-4 py-4">
            <ul className="space-y-4">
              <li>
                <a 
                  href="#" 
                  className="block text-brand-white hover:text-brand-accent transition-colors duration-300 font-body"
                  onClick={() => setIsMenuOpen(false)}
                >
                  À remplir
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="block text-brand-white hover:text-brand-accent transition-colors duration-300 font-body"
                  onClick={() => setIsMenuOpen(false)}
                >
                  À remplir
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="block text-brand-white hover:text-brand-accent transition-colors duration-300 font-body"
                  onClick={() => setIsMenuOpen(false)}
                >
                  À remplir
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