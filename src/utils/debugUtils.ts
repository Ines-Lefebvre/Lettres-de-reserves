// Utilitaires de debug pour l'API n8n
import { n8nApi } from './n8nApiClient';

export class DebugUtils {
  static isDebugMode(): boolean {
    return new URLSearchParams(window.location.search).has('debug');
  }

  static async testCorsConnectivity(): Promise<void> {
    console.log('🔧 Test de connectivité CORS...');
    
    try {
      const isConnected = await n8nApi.testCorsConnectivity();
      
      if (isConnected) {
        console.log('✅ CORS: Connectivité OK');
      } else {
        console.log('❌ CORS: Échec de connectivité');
      }
    } catch (error) {
      console.error('❌ CORS: Erreur de test', error);
    }
  }

  static logSessionInfo(): void {
    const user = n8nApi.getCurrentUser();
    const sessionData = n8nApi.getSessionData();
    
    console.log('📊 Informations de session:', {
      authenticated: n8nApi.isAuthenticated(),
      user,
      sessionData
    });
  }

  static async testAuthFlow(email: string = 'test@example.com', password: string = 'test123'): Promise<void> {
    console.log('🧪 Test du flux d\'authentification Simple CORS...');
    
    try {
      // Test inscription
      console.log('1. Test inscription...');
      const registerResult = await n8nApi.authenticate(email, password, 'register');
      console.log('Résultat inscription:', registerResult);
      
      if (registerResult.ok) {
        console.log('✅ Inscription réussie');
        
        // Test déconnexion
        n8nApi.logout();
        console.log('2. Déconnexion effectuée');
        
        // Test connexion
        console.log('3. Test connexion...');
        const loginResult = await n8nApi.authenticate(email, password, 'login');
        console.log('Résultat connexion:', loginResult);
        
        if (loginResult.ok) {
          console.log('✅ Connexion réussie');
        } else {
          console.log('❌ Échec de connexion');
        }
      } else {
        console.log('❌ Échec d\'inscription');
      }
    } catch (error) {
      console.error('❌ Erreur test auth:', error);
    }
  }

  static async testFileUpload(): Promise<void> {
    console.log('📁 Test d\'upload de fichier Simple CORS...');
    
    // Créer un fichier PDF factice pour le test
    const testPdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF';
    const testFile = new File([testPdfContent], 'test-document.pdf', { type: 'application/pdf' });
    
    try {
      const result = await n8nApi.uploadFile(testFile);
      console.log('Résultat upload:', result);
      
      if (result.ok) {
        console.log('✅ Upload réussi');
      } else {
        console.log('❌ Échec upload');
      }
    } catch (error) {
      console.error('❌ Erreur test upload:', error);
    }
  }

  static enableDebugMode(): void {
    const url = new URL(window.location.href);
    url.searchParams.set('debug', '1');
    window.history.replaceState({}, '', url.toString());
    console.log('🔧 Mode debug activé - rechargez la page');
  }

  static disableDebugMode(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('debug');
    window.history.replaceState({}, '', url.toString());
    console.log('🔧 Mode debug désactivé - rechargez la page');
  }

  static showDebugPanel(): void {
    if (!this.isDebugMode()) {
      console.log('Mode debug non activé. Utilisez DebugUtils.enableDebugMode()');
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
    `;

    panel.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold;">🔧 Debug Panel</div>
      <button onclick="DebugUtils.testCorsConnectivity()" style="margin: 2px; padding: 4px 8px; font-size: 10px;">Test CORS</button>
      <button onclick="DebugUtils.logSessionInfo()" style="margin: 2px; padding: 4px 8px; font-size: 10px;">Session Info</button>
      <button onclick="DebugUtils.testAuthFlow()" style="margin: 2px; padding: 4px 8px; font-size: 10px;">Test Auth</button>
      <button onclick="DebugUtils.testFileUpload()" style="margin: 2px; padding: 4px 8px; font-size: 10px;">Test Upload</button>
      <button onclick="document.getElementById('debug-panel').remove()" style="margin: 2px; padding: 4px 8px; font-size: 10px; background: red;">Fermer</button>
    `;

    // Supprimer le panel existant s'il y en a un
    const existing = document.getElementById('debug-panel');
    if (existing) existing.remove();

    document.body.appendChild(panel);

    // Exposer les méthodes globalement pour les boutons
    (window as any).DebugUtils = DebugUtils;
  }

  static async testEndpoint(action: 'login' | 'register' = 'register', email: string = 'franck.lapuyade@gmail.com', password: string = '123456789'): Promise<void> {
    try {
      console.log('🧪 Test Simple CORS de l\'endpoint n8n');
      console.log('📧 Email:', email);
      console.log('🔑 Action:', action);
      
      const formData = new FormData();
      formData.append('action', action);
      formData.append('email', email);
      formData.append('password', password);
      
      const response = await fetch('https://n8n.srv833062.hstgr.cloud/webhook/auth', {
        method: 'POST',
        mode: 'cors',
        body: formData
      });
      
      console.log('📡 Status:', response.status);
      console.log('📡 Headers:', Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log('📄 Response:', text);
      
      try {
        const json = JSON.parse(text);
        console.log('📊 JSON:', json);
      } catch {
        console.log('⚠️ Réponse non-JSON');
      }
      
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  }

  // Test rapide depuis la console
  public async quickTest(): Promise<void> {
    console.log('🚀 Test rapide Simple CORS...');
    console.log('🔄 Aucun préflight OPTIONS ne devrait apparaître');
    console.log('💡 Pour tester manuellement, utilisez :');
    console.log('   n8nApi.authenticate("email@test.com", "password", "register")');
    console.log('   DebugUtils.testCorsConnectivity() // Test simple');
  }
}

// Auto-initialisation en mode debug
if (DebugUtils.isDebugMode()) {
  console.log('🔧 Mode debug détecté');
  console.log('💡 Utilisez DebugUtils.showDebugPanel() pour afficher le panel de debug');
  console.log('💡 Ou utilisez les méthodes individuelles : testCorsConnectivity(), logSessionInfo(), etc.');
  
  // Exposer globalement pour la console
  (window as any).DebugUtils = DebugUtils;
  (window as any).n8nApi = n8nApi;
}

export default DebugUtils;