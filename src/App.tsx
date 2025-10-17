import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import ValidationErrorBoundary from './components/ValidationErrorBoundary';
import UploadPage from './pages/Upload';
import ValidationPage from './pages/ValidationPage';
import { logEnvironmentDiagnostic } from './utils/envDiagnostic';

/**
 * App - SIMPLE
 *
 * 2 routes principales :
 * - / : Upload de fichiers
 * - /validation : Validation des données depuis n8n
 */
function App() {
  // Diagnostic des variables d'environnement au démarrage
  useEffect(() => {
    console.log('🚀 Application démarrée');
    logEnvironmentDiagnostic();
  }, []);

  return (
    <ValidationErrorBoundary>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/validation" element={<ValidationPage />} />
      </Routes>
    </ValidationErrorBoundary>
  );
}

export default App;
