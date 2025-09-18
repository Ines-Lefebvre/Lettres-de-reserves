// Client API n8n simplifié - Upload uniquement
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
  next?: string;
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

export class N8nApiClient {
  private debugMode = false;

  // Endpoint de production - uniquement upload
  private readonly uploadEndpoint = import.meta.env.VITE_N8N_UPLOAD_URL || '/webhook/upload';

  constructor() {
    // Activer le mode debug si paramètre URL présent
    this.debugMode = new URLSearchParams(window.location.search).has('debug');
    if (this.debugMode) {
      console.log('🔧 N8nApiClient: Mode debug activé - Upload uniquement');
    }
  }

  // Génération d'identifiants uniques
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIdempotencyKey(): string {
    return `idem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 🔄 Upload de fichier - FormData
  async uploadFile(file: File): Promise<ApiResponse<UploadResponse>> {
    const requestId = this.generateRequestId();
    
    try {
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

      if (this.debugMode) {
        console.log(`🚀 Upload Request [${requestId}]:`, {
          filename: file.name,
          size: file.size,
          type: file.type
        });
      }

      // Préparation du FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);
      formData.append('filesize', file.size.toString());
      formData.append('requestId', requestId);
      formData.append('idempotencyKey', this.generateIdempotencyKey());
      formData.append('timestamp', new Date().toISOString());

      const response = await fetch(this.uploadEndpoint, {
        method: 'POST',
        mode: 'cors',
        body: formData
      });

      if (this.debugMode) {
        console.log(`📡 Upload Response [${requestId}]:`, {
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
        console.log(`✅ Upload Success [${requestId}]:`, data);
      }

      // Stocker les données extraites pour la page de validation
      if (data?.data) {
        sessionStorage.setItem('extracted_data', JSON.stringify(data.data));
        sessionStorage.setItem('request_id', data.requestId || requestId);
      }

      return {
        ok: true,
        data,
        requestId: data.requestId || requestId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      
      if (this.debugMode) {
        console.error(`❌ Upload Error [${requestId}]:`, error);
      }

      return {
        ok: false,
        error: errorMessage,
        requestId
      };
    }
  }

  // 🆕 Test de connectivité
  async testConnectivity(): Promise<boolean> {
    try {
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const result = await this.uploadFile(testFile);
      return result.ok;
    } catch {
      return false;
    }
  }

  // Récupération des données de session
  getSessionData(): { requestId: string | null; extractedData: any } {
    const requestId = sessionStorage.getItem('request_id');
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

  // Nettoyage des données de session
  clearSessionData(): void {
    sessionStorage.removeItem('request_id');
    sessionStorage.removeItem('extracted_data');
  }
}

// Instance globale
export const n8nApi = new N8nApiClient();

// Export pour les tests
export default N8nApiClient;