// Module d'authentification réutilisable
export interface User {
  userId: string;
  email: string;
  exp: number;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  error?: string;
}

export class AuthManager {
  private static instance: AuthManager;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly API_BASE = 'https://n8n.srv833062.hstgr.cloud';
  private readonly AUTH_ENDPOINT = 'https://n8n.srv833062.hstgr.cloud/webhook/auth';

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // Stockage sécurisé du token
  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  // Décodage JWT simple (sans vérification de signature côté client)
  private decodeJWT(token: string): User | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return {
        userId: decoded.userId,
        email: decoded.email,
        exp: decoded.exp
      };
    } catch (error) {
      console.error('Erreur décodage JWT:', error);
      return null;
    }
  }

  // Vérification de validité du token
  public isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    const user = this.decodeJWT(token);
    if (!user) return false;

    // Vérifier expiration (avec marge de 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const isExpired = user.exp <= (now + 300);
    
    if (isExpired) {
      this.logout();
      return false;
    }

    return true;
  }

  // Obtenir l'utilisateur actuel
  public getCurrentUser(): User | null {
    const token = this.getToken();
    if (!token || !this.isTokenValid()) return null;
    
    return this.decodeJWT(token);
  }

  // Headers pour les requêtes authentifiées
  public getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Origin': window.location.origin
    };

    const token = this.getToken();
    if (token && this.isTokenValid()) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Connexion
  public async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('🔐 Tentative de connexion pour:', email);
      
      const response = await fetch(this.AUTH_ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          action: 'login',
          email,
          password
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', [...response.headers.entries()]);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      console.log('📦 Full response:', result);

      // Le workflow N8N retourne { response: { ok: true, token: "...", user: {...} } }
      let data;
      if (result.response && result.response.ok) {
        data = result.response;
      } else if (result.ok) {
        data = result;
      } else {
        throw new Error(result.error || result.response?.error || 'Authentication failed');
      }

      if (data.ok && data.token) {
        this.setToken(data.token);
        const user = this.decodeJWT(data.token);
        if (user) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
        console.log('✅ Connexion réussie pour:', email);
        return { success: true, token: data.token, user };
      } else {
        return { 
          success: false, 
          error: data.error || data.message || 'Erreur de connexion' 
        };
      }
    } catch (error) {
      console.error('❌ Erreur login:', error);
      return { 
        success: false, 
        error: 'Erreur de connexion au serveur' 
      };
    }
  }

  // Inscription
  public async register(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('📝 Tentative d\'inscription pour:', email);
      
      const response = await fetch(this.AUTH_ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          action: 'register',
          email,
          password
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', [...response.headers.entries()]);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      console.log('📦 Full response:', result);

      // Le workflow N8N retourne { response: { ok: true, token: "...", user: {...} } }
      let data;
      if (result.response && result.response.ok) {
        data = result.response;
      } else if (result.ok) {
        data = result;
      } else {
        throw new Error(result.error || result.response?.error || 'Registration failed');
      }

      if (data.ok && data.token) {
        this.setToken(data.token);
        const user = this.decodeJWT(data.token);
        if (user) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
        console.log('✅ Inscription réussie pour:', email);
        return { success: true, token: data.token, user };
      } else {
        return { 
          success: false, 
          error: data.error || data.message || 'Erreur lors de l\'inscription' 
        };
      }
    } catch (error) {
      console.error('❌ Erreur register:', error);
      return { 
        success: false, 
        error: 'Erreur de connexion au serveur' 
      };
    }
  }

  // Déconnexion
  public logout(): void {
    this.removeToken();
    // Rediriger vers la page de connexion
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // Vérification et redirection si non authentifié
  public requireAuth(): boolean {
    if (!this.isTokenValid()) {
      if (typeof window !== 'undefined') {
        // Sauvegarder l'URL actuelle pour redirection après connexion
        localStorage.setItem('redirect_after_login', window.location.pathname);
        window.location.href = '/login';
      }
      return false;
    }
    return true;
  }

  // Redirection après connexion
  public redirectAfterLogin(): void {
    const redirectUrl = localStorage.getItem('redirect_after_login') || '/upload';
    localStorage.removeItem('redirect_after_login');
    if (typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  }

  // Fonction de test pour valider l'endpoint
  public async testEndpoint(action: 'login' | 'register' = 'register', email: string = 'franck.lapuyade@gmail.com', password: string = '123456789'): Promise<void> {
    try {
      console.log('🧪 Test de l\'endpoint:', this.AUTH_ENDPOINT);
      console.log('📧 Email:', email);
      console.log('🔑 Action:', action);
      
      const response = await fetch(this.AUTH_ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          action,
          email,
          password
        })
      });
      
      console.log('📡 Status:', response.status);
      console.log('📡 Status Text:', response.statusText);
      console.log('📡 Headers:', [...response.headers.entries()]);
      
      const data = await response.text();
      console.log('✅ SUCCESS:', data);
      
      // Essayer de parser en JSON si possible
      try {
        const jsonData = JSON.parse(data);
        console.log('📦 Parsed JSON:', jsonData);
      } catch {
        console.log('📄 Response is not JSON');
      }
      
    } catch (error) {
      console.error('❌ ERROR:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🌐 Problème de réseau ou CORS');
      }
    }
  }

  // Test rapide depuis la console
  public async quickTest(): Promise<void> {
    console.log('🚀 Test rapide de l\'authentification...');
    console.log('🔄 Tests désactivés en développement local');
    console.log('💡 Pour tester manuellement, utilisez :');
    console.log('   authManager.testEndpoint("register", "email@test.com", "password")');
    console.log('   authManager.testEndpoint("login", "email@test.com", "password")');
  }
}

// Instance globale
export const authManager = AuthManager.getInstance();