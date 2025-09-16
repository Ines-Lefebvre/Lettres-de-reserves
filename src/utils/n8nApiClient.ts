// Client API n8n Simple CORS (sans préflight)
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
  redirect?: string;
  next?: string;
}

export interface AuthRequest {
  action: 'login' | 'register';
  email: string;
  password: string;
}

export interface AuthResponse {
  ok: boolean;
  token: string;
  user: {
    id: string;
    email: string;
  };
  redirect: '/upload' | '/validation';
}

export interface UploadResponse {
  ok: boolean;
  requestId: string;
  next: '/validation';
  data: {
    extractedFields: Record<string, any>;
    ocrConfidence: number;
    documentType: string;
  };
}

export interface ValidationRequest {
  requestId: string;
  email: string;
  fieldsEdited: Record<string, any>;
}

export interface ValidationResponse {
  ok: boolean;
  next: '/checkout';
  payment: {
    checkoutUrl: string;
    sessionId: string;
  };
}

export class N8nApiClient {
  private readonly baseUrl = 'https://n8n.srv833062.hstgr.cloud';
  private readonly tokenKey = 'n8n_auth_token';
  private readonly requestIdKey = 'n8n_request_id';
  private debugMode = false;

  // Endpoints corrigés
  private readonly endpoints = {
    auth: '/webhook-test/auth',
    upload: '/webhook-test/upload',
    validate: '/webhook-test/validate',
    health: '/webhook-test/health'
  };

  constructor() {
    // Activer le mode debug si paramètre URL présent
    this.debugMode = new URLSearchParams(window.location.search).has('debug');
    if (this.debugMode) {
      console.log('🔧 N8nApiClient: Mode debug activé - Simple CORS');
    }
  }

  // Génération d'identifiants uniques
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIdempotencyKey(): string {
    return `idem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Gestion des tokens JWT
  private getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private removeToken(): void {
    localStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.requestIdKey);
  }

  // Vérification de validité du token
  private isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  // Méthode générique pour les requêtes Simple CORS
  private async makeSimpleRequest<T>(
    endpoint: string, 
    formData: FormData,
    requireAuth = false
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    
    try {
      if (this.debugMode) {
        console.log(`🚀 Simple CORS Request [${requestId}]:`, {
          endpoint,
          requireAuth,
          hasToken: !!this.getToken(),
          formDataKeys: Array.from(formData.keys())
        });
      }

      // Vérifier l'authentification si requise
      if (requireAuth && !this.isTokenValid()) {
        throw new Error('Token d\'authentification invalide ou expiré');
      }

      // Ajouter le token dans le body si authentification requise
      if (requireAuth) {
        const token = this.getToken();
        if (token) {
          formData.append('token', token);
        }
      }

      // Ajouter requestId et idempotencyKey dans le body
      formData.append('requestId', requestId);
      formData.append('idempotencyKey', this.generateIdempotencyKey());

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        mode: 'cors',
        // PAS de credentials: 'include'
        // PAS de headers custom
        body: formData
      });

      if (this.debugMode) {
        console.log(`📡 Simple CORS Response [${requestId}]:`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
      }

      // Gestion des erreurs HTTP
      if (!response.ok) {
        let errorMessage = `Erreur HTTP ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      // Parse de la réponse
      const contentType = response.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (this.debugMode) {
        console.log(`✅ Simple CORS Success [${requestId}]:`, data);
      }

      return {
        ok: true,
        data,
        requestId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      
      if (this.debugMode) {
        console.error(`❌ Simple CORS Error [${requestId}]:`, error);
      }

      // Auto-logout si token expiré
      if (errorMessage.includes('invalide') || errorMessage.includes('expiré')) {
        this.removeToken();
      }

      return {
        ok: false,
        error: errorMessage,
        requestId
      };
    }
  }

  // Authentification (login/register) - application/x-www-form-urlencoded
  async authenticate(email: string, password: string, action: 'login' | 'register'): Promise<ApiResponse<AuthResponse>> {
    const formData = new FormData();
    formData.append('action', action);
    formData.append('email', email);
    formData.append('password', password);

    const result = await this.makeSimpleRequest<AuthResponse>(this.endpoints.auth, formData);

    // Stocker le token si succès
    if (result.ok && result.data?.token) {
      this.setToken(result.data.token);
      
      if (this.debugMode) {
        console.log('🔐 Token stocké:', result.data.token.substring(0, 20) + '...');
      }
    }

    return result;
  }

  // Upload de fichier - multipart/form-data
  async uploadFile(file: File): Promise<ApiResponse<UploadResponse>> {
    // Validation côté client
    if (!file) {
      return {
        ok: false,
        error: 'Aucun fichier sélectionné'
      };
    }

    if (file.type !== 'application/pdf') {
      return {
        ok: false,
        error: 'Seuls les fichiers PDF sont acceptés'
      };
    }

    if (file.size > 15 * 1024 * 1024) { // 15MB
      return {
        ok: false,
        error: 'Le fichier ne doit pas dépasser 15MB'
      };
    }

    // Préparation du FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);
    formData.append('filesize', file.size.toString());
    formData.append('timestamp', new Date().toISOString());

    const result = await this.makeSimpleRequest<UploadResponse>(this.endpoints.upload, formData, true);

    // Stocker le requestId pour la validation
    if (result.ok && result.data?.requestId) {
      sessionStorage.setItem(this.requestIdKey, result.data.requestId);
      
      if (this.debugMode) {
        console.log('📝 RequestId stocké:', result.data.requestId);
      }
    }

    return result;
  }

  // Validation des champs - application/x-www-form-urlencoded
  async validateFields(fieldsEdited: Record<string, any>): Promise<ApiResponse<ValidationResponse>> {
    const requestId = sessionStorage.getItem(this.requestIdKey);
    const token = this.getToken();
    
    if (!requestId) {
      return {
        ok: false,
        error: 'Aucune session de validation trouvée'
      };
    }

    if (!token) {
      return {
        ok: false,
        error: 'Authentification requise'
      };
    }

    // Extraire l'email du token
    let email = '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      email = payload.email || '';
    } catch {
      return {
        ok: false,
        error: 'Token invalide'
      };
    }

    const formData = new FormData();
    formData.append('requestId', requestId);
    formData.append('email', email);
    formData.append('fieldsEdited', JSON.stringify(fieldsEdited));

    return await this.makeSimpleRequest<ValidationResponse>(this.endpoints.validate, formData, true);
  }

  // Utilitaires
  getCurrentUser(): { email: string; id: string } | null {
    const token = this.getToken();
    if (!token || !this.isTokenValid()) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        email: payload.email,
        id: payload.userId || payload.id
      };
    } catch {
      return null;
    }
  }

  logout(): void {
    this.removeToken();
    if (this.debugMode) {
      console.log('👋 Déconnexion effectuée');
    }
  }

  isAuthenticated(): boolean {
    return this.isTokenValid();
  }

  // Test de connectivité Simple CORS
  async testCorsConnectivity(): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('test', 'connectivity');
      
      const response = await fetch(`${this.baseUrl}${this.endpoints.health}`, {
        method: 'POST',
        mode: 'cors',
        body: formData
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  // Récupération des données de session
  getSessionData(): { requestId: string | null; extractedData: any } {
    const requestId = sessionStorage.getItem(this.requestIdKey);
    const extractedData = sessionStorage.getItem('extracted_data');
    
    return {
      requestId,
      extractedData: extractedData ? JSON.parse(extractedData) : null
    };
  }

  // Stockage des données extraites
  setExtractedData(data: any): void {
    sessionStorage.setItem('extracted_data', JSON.stringify(data));
  }
}

// Instance globale
export const n8nApi = new N8nApiClient();

// Export pour les tests
export default N8nApiClient;