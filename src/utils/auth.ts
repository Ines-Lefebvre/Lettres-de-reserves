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
  private readonly API_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL?.replace('/webhook', '') || 'https://votre-instance-n8n.com';

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
      'Origin': 'https://landing-page-convers-h8da.bolt.host',
      'Content-Type': 'application/json'
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
      const response = await fetch(`${this.API_BASE_URL}/webhook/auth`, {
        method: 'POST',
        headers: {
          'Origin': 'https://landing-page-convers-h8da.bolt.host',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'login',
          email,
          password
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        this.setToken(data.token);
        const user = this.decodeJWT(data.token);
        if (user) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
        return { success: true, token: data.token, user };
      } else {
        return { 
          success: false, 
          error: data.message || data.error || 'Erreur de connexion' 
        };
      }
    } catch (error) {
      console.error('Erreur login:', error);
      return { 
        success: false, 
        error: 'Erreur de connexion au serveur' 
      };
    }
  }

  // Inscription
  public async register(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/webhook/auth`, {
        method: 'POST',
        headers: {
          'Origin': 'https://landing-page-convers-h8da.bolt.host',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'register',
          email,
          password
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        this.setToken(data.token);
        const user = this.decodeJWT(data.token);
        if (user) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
        return { success: true, token: data.token, user };
      } else {
        return { 
          success: false, 
          error: data.message || data.error || 'Erreur lors de l\'inscription' 
        };
      }
    } catch (error) {
      console.error('Erreur register:', error);
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
}

// Instance globale
export const authManager = AuthManager.getInstance();