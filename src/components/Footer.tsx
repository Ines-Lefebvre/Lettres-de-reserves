import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-brand-dark text-brand-white py-12 px-4" role="contentinfo">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Cabinet Info */}
          <div className="md:col-span-2">
            <h2 className="font-headline text-xl font-bold text-brand-accent mb-4">
              Cabinet Bailly Lacresse
            </h2>
            <div className="space-y-2 font-body text-brand-text-light">
              <p>2 Rue des Halles, 75001 Paris</p>
              <p>
                <a 
                  href="mailto:email@renseigner.fr" 
                  className="hover:text-brand-accent focus:text-brand-accent transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50 rounded"
                  aria-label="Envoyer un email au cabinet"
                >
                  email@renseigner.fr
                </a>
              </p>
              <p>
                <a 
                  href="tel:+33000000000" 
                  className="hover:text-brand-accent focus:text-brand-accent transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50 rounded"
                  aria-label="Appeler le cabinet"
                >
                  téléphone à renseigner
                </a>
              </p>
            </div>
          </div>
          
          {/* Social Media */}
          <div>
            <h3 className="font-headline text-lg font-semibold text-brand-accent mb-4">
              Nous suivre
            </h3>
            <div className="space-y-2 font-body text-brand-text-light">
              <p>
                <a 
                  href="#" 
                  className="hover:text-brand-accent focus:text-brand-accent transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50 rounded"
                  aria-label="Suivre le cabinet sur LinkedIn"
                >
                  LinkedIn
                </a>
              </p>
            </div>
          </div>
          
          {/* Legal Info */}
          <div>
            <h3 className="font-headline text-lg font-semibold text-brand-accent mb-4">
              Informations légales
            </h3>
            <div className="space-y-2 font-body text-brand-text-light">
              <p>
                <a 
                  href="#" 
                  className="hover:text-brand-accent focus:text-brand-accent transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50 rounded"
                >
                  Mentions légales
                </a>
              </p>
              <p>
                <a 
                  href="#" 
                  className="hover:text-brand-accent focus:text-brand-accent transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50 rounded"
                >
                  RGPD
                </a>
              </p>
              <p>
                <a 
                  href="#" 
                  className="hover:text-brand-accent focus:text-brand-accent transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50 rounded"
                >
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