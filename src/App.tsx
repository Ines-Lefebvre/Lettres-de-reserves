import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ChevronUp, Upload, Menu, X } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import UploadPage from './pages/Upload';

const HomePage: React.FC = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeTab, setActiveTab] = useState('avec');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCTAClick = () => {
    window.location.href = '/upload';
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const CircularCTA = ({ className = "", size = "large" }) => {
    const sizeClasses = size === "large" 
      ? "w-20 h-20" 
      : "w-16 h-16";
    
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <div className="absolute -inset-2 rounded-full animate-rotate-bicolor bg-gradient-conic from-brand-accent via-brand-dark to-brand-accent" style={{
          background: 'conic-gradient(from 0deg, #c19a5f 0deg, #c19a5f 120deg, #3c3533 120deg, #3c3533 240deg, #c19a5f 240deg, #c19a5f 360deg)'
        }}></div>
        <button 
          onClick={handleCTAClick}
          className={`relative ${sizeClasses} bg-brand-white hover:bg-brand-light rounded-full shadow-xl transition-all duration-300 transform hover:scale-110 group z-10 border-2 border-white`}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Upload className="w-8 h-8 text-brand-dark group-hover:scale-110 transition-transform duration-300" />
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-white">
      {/* Fixed Header with Burger Menu */}
      <Header onMenuToggle={setIsMenuOpen} />

      {/* Header Section */}
      <section className="bg-brand-dark text-brand-white pt-32 pb-24 md:pt-40 md:pb-32 px-4 relative overflow-hidden min-h-screen">
        {/* Background Video */}
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        >
          <source src="/lawyer-video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-dark to-brand-dark opacity-50"></div>
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center">
            <h1 className="font-headline text-4xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="text-brand-accent">Protégez</span> votre entreprise
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-brand-text-light font-body leading-relaxed max-w-4xl mx-auto">
              Une lettre de réserve signée par un avocat spécialisé en accident du travail & maladie professionnelle, 
              <span className="text-brand-accent font-semibold"> prête en urgence</span> pour éviter des milliers d'euros de surcoûts.
            </p>
          </div>
        </div>
      </section>

      {/* Problem & Urgency Section */}
      <section className="bg-brand-light py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-headline text-3xl md:text-4xl font-bold mb-6">
              <span className="text-brand-accent">Le vrai coût</span> de l'inaction
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-brand-neutral p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl font-bold text-brand-accent mb-2">95%</div>
              <p className="text-brand-text-dark font-body">des accidents reconnus automatiquement sans réserves</p>
              <p className="text-sm text-gray-500 mt-2">(CPAM, 2024)</p>
            </div>
            
            <div className="bg-brand-neutral p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl font-bold text-brand-accent mb-2">+35%</div>
              <p className="text-brand-text-dark font-body">d'augmentation moyenne du taux cotisation AT/MP</p>
              <p className="text-sm text-gray-500 mt-2">(URSSAF, 2023)</p>
            </div>
            
            <div className="bg-brand-neutral p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl font-bold text-brand-accent mb-2">18 000€</div>
              <p className="text-brand-text-dark font-body">de coût moyen direct par accident</p>
              <p className="text-sm text-gray-500 mt-2">(Assurance Maladie, 2024)</p>
            </div>
            
            <div className="bg-brand-neutral p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl font-bold text-brand-accent mb-2">5 ans</div>
              <p className="text-brand-text-dark font-body">de surcotisations possibles</p>
              <p className="text-sm text-gray-500 mt-2">(Carsat, 2023)</p>
            </div>
          </div>
          
          <div className="text-center bg-brand-neutral p-8 rounded-lg border-2 border-brand-accent border-opacity-30">
            <p className="text-xl font-semibold text-brand-text-dark mb-6">
              Sans lettre de réserves, chaque accident devient une <span className="text-brand-accent font-bold">facture lourde et durable.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Solution & Benefits Section */}
      <section className="bg-brand-light py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-brand-text-dark mb-6">
              <span className="text-brand-accent">La solution :</span> votre défense immédiate
            </h2>
          </div>
          
          {/* Tabs Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-brand-white rounded-lg p-1 shadow-md">
              <button
                onClick={() => setActiveTab('sans')}
                className={`px-6 py-3 rounded-md font-headline font-semibold transition-all duration-300 ${
                  activeTab === 'sans'
                    ? 'bg-brand-light text-brand-text-dark'
                    : 'text-gray-600 hover:text-brand-text-dark'
                }`}
              >
                Sans lettre de réserves
              </button>
              <button
                onClick={() => setActiveTab('avec')}
                className={`px-6 py-3 rounded-md font-headline font-semibold transition-all duration-300 ${
                  activeTab === 'avec'
                    ? 'bg-brand-dark text-brand-white border-2 border-brand-accent'
                    : 'text-gray-600 hover:text-brand-text-dark'
                }`}
              >
                Avec lettre de réserves
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-brand-white rounded-lg shadow-lg p-8 mb-12 min-h-[300px]">
            {activeTab === 'sans' && (
              <div className="animate-fade-in">
                <h3 className="font-headline text-2xl font-semibold text-brand-accent mb-6 text-center">
                  La réalité sans protection
                </h3>
                <div className="max-w-3xl mx-auto">
                  <ul className="space-y-4 text-lg font-body text-brand-text-dark">
                    <li className="flex items-start">
                      <span className="text-brand-accent mr-3 mt-1 font-bold">•</span>
                      <span>Reconnaissance quasi automatique de l'accident par la CPAM</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-brand-accent mr-3 mt-1 font-bold">•</span>
                      <span>Présomption d'imputabilité favorable au salarié</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-brand-accent mr-3 mt-1 font-bold">•</span>
                      <span>Charge financière automatiquement imputée au compte employeur</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-brand-accent mr-3 mt-1 font-bold">•</span>
                      <span>Très peu de recours possibles après reconnaissance</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'avec' && (
              <div className="animate-fade-in">
                <h3 className="font-headline text-2xl font-semibold text-brand-accent mb-6 text-center">
                  Votre défense immédiate
                </h3>
                <div className="max-w-3xl mx-auto">
                  <ul className="space-y-4 text-lg font-body text-brand-text-dark">
                    <li className="flex items-start">
                      <span className="text-brand-accent mr-3 mt-1 font-bold">•</span>
                      <span>Déclenchement automatique d'une enquête approfondie par la CPAM</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-brand-accent mr-3 mt-1 font-bold">•</span>
                      <span>Ouverture d'un délai d'instruction contradictoire</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-brand-accent mr-3 mt-1 font-bold">•</span>
                      <span>Rééquilibrage du débat en faveur de l'employeur</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-brand-accent mr-3 mt-1 font-bold">•</span>
                      <span>Réduction significative des risques financiers</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-brand-accent mr-3 mt-1 font-bold">•</span>
                      <span>Préservation complète des droits de recours</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="bg-brand-dark text-brand-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-headline text-3xl md:text-4xl font-bold mb-6">
              <span className="text-brand-accent">Témoignages</span> clients
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-brand-light bg-opacity-10 p-6 rounded-lg">
              <div className="text-4xl text-brand-accent mb-4 font-serif">«</div>
              <div className="flex mb-4 text-brand-accent">
                ★★★★★
              </div>
              <p className="text-brand-text-light mb-4 font-body italic">
                Grâce aux lettres de réserve rédigées par l'avocat, nous avons évité une lourde surcotisation.
              </p>
              <div className="text-4xl text-brand-accent mb-4 font-serif text-right">»</div>
              <div className="text-brand-accent font-semibold">
                — Claire Dupont, Gérante<br />
                <span className="text-sm text-brand-text-light">Menuiserie Dupont (10 salariés)</span>
              </div>
            </div>
            
            <div className="bg-brand-light bg-opacity-10 p-6 rounded-lg">
              <div className="text-4xl text-brand-accent mb-4 font-serif">«</div>
              <div className="flex mb-4 text-brand-accent">
                ★★★★★
              </div>
              <p className="text-brand-text-light mb-4 font-body italic">
                Dès le premier accident, la CPAM a dû enquêter, et nous avons pu contester avec succès.
              </p>
              <div className="text-4xl text-brand-accent mb-4 font-serif text-right">»</div>
              <div className="text-brand-accent font-semibold">
                — Jean Martin, Directeur<br />
                <span className="text-sm text-brand-text-light">Transports Martin (53 salariés)</span>
              </div>
            </div>
            
            <div className="bg-brand-light bg-opacity-10 p-6 rounded-lg">
              <div className="text-4xl text-brand-accent mb-4 font-serif">«</div>
              <div className="flex mb-4 text-brand-accent">
                ★★★★★
              </div>
              <p className="text-brand-text-light mb-4 font-body italic">
                Sa parfaite connaissance du droit des AT/MP nous a permis de défendre efficacement nos intérêts.
              </p>
              <div className="text-4xl text-brand-accent mb-4 font-serif text-right">»</div>
              <div className="text-brand-accent font-semibold">
                — Franck Lapuyade, Président<br />
                <span className="text-sm text-brand-text-light">Atexya SAS</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-brand-accent mb-2">96%</div>
              <p className="text-brand-text-light">clients satisfaits</p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="bg-brand-light py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-brand-text-dark mb-6">
              <span className="text-brand-accent">Simple et rapide</span>, en 3 étapes
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">1</span>
              </div>
              <h3 className="font-headline text-xl font-semibold mb-3 text-brand-text-dark">Téléversez</h3>
              <p className="text-brand-text-dark font-body">votre déclaration d'accident du travail ou de maladie professionnelle</p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">2</span>
              </div>
              <h3 className="font-headline text-xl font-semibold mb-3 text-brand-text-dark">Rédaction</h3>
              <p className="text-brand-text-dark font-body">nos avocats rédigent immédiatement votre lettre de réserve</p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">3</span>
              </div>
              <h3 className="font-headline text-xl font-semibold mb-3 text-brand-text-dark">Réception</h3>
              <p className="text-brand-text-dark font-body">vous recevez un document juridiquement solide, prêt à transmettre</p>
            </div>
          </div>
          
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-brand-dark text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="font-headline text-3xl md:text-5xl font-bold mb-6">
            <span className="text-brand-accent">Agissez avant</span> qu'il ne soit trop tard
          </h2>
          <p className="text-xl md:text-2xl mb-8 leading-relaxed">
            Un accident déclaré sans réserves peut coûter <span className="font-bold text-brand-accent">jusqu'à 30 000 €</span> à votre entreprise.<br />
            <span className="font-bold">Agissez maintenant.</span>
          </p>
        </div>
      </section>

      {/* Legal Section */}
      <section className="bg-brand-dark text-brand-text-light py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center text-sm">
            <p className="mb-2 font-body italic">
              Service assuré par avocat inscrit au barreau.
            </p>
            <p className="font-body">
              Vos données sont strictement confidentielles, sécurisées et conformes au RGPD. Aucun partage avec des tiers.
            </p>
          </div>
        </div>
      </section>

      <Footer />

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-brand-dark bg-opacity-95 backdrop-blur-sm border-t border-brand-accent border-opacity-30 p-4 z-50">
        <div className="container mx-auto max-w-6xl flex justify-end items-center gap-4">
          <CircularCTA size="small" />
          <button 
            onClick={handleCTAClick}
            className="bg-brand-accent hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-headline font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Téléverser maintenant
          </button>
        </div>
      </div>

      {/* Sticky CTA */}
      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 bg-brand-accent hover:bg-opacity-90 text-white p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 z-40"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/upload" element={<UploadPage />} />
    </Routes>
  );
}

export default App;