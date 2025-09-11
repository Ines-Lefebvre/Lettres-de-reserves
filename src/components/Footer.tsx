import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-brand-dark text-brand-white py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Cabinet Info */}
          <div className="md:col-span-2">
            <h3 className="font-headline text-xl font-bold text-brand-accent mb-4">
              Cabinet Bailly Lacresse
            </h3>
            <div className="space-y-2 font-body text-brand-text-light">
              <p>2 Rue des Halles, 75001 Paris</p>
              <p>
                <a href="mailto:email@renseigner.fr" className="hover:text-brand-accent transition-colors duration-300">
                  email@renseigner.fr
                </a>
              </p>
              <p>
                <a href="tel:+33000000000" className="hover:text-brand-accent transition-colors duration-300">
                  téléphone à renseigner
                </a>
              </p>
            </div>
          </div>
          
          {/* Social Media */}
          <div>
            <h4 className="font-headline text-lg font-semibold text-brand-accent mb-4">
              Nous suivre
            </h4>
            <div className="space-y-2 font-body text-brand-text-light">
              <p>
                <a href="#" className="hover:text-brand-accent transition-colors duration-300">
                  LinkedIn
                </a>
              </p>
            </div>
          </div>
          
          {/* Legal Info */}
          <div>
            <h4 className="font-headline text-lg font-semibold text-brand-accent mb-4">
              Informations légales
            </h4>
            <div className="space-y-2 font-body text-brand-text-light">
              <p>
                <a href="#" className="hover:text-brand-accent transition-colors duration-300">
                  Mentions légales
                </a>
              </p>
              <p>
                <a href="#" className="hover:text-brand-accent transition-colors duration-300">
                  RGPD
                </a>
              </p>
              <p>
                <a href="#" className="hover:text-brand-accent transition-colors duration-300">
                  CGU
                </a>
              </p>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-brand-accent border-opacity-30 pt-6">
          <p className="text-center font-body text-brand-text-light text-sm">
            © 2025 Cabinet Bailly-Lacresse - Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;