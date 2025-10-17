/**
 * API client pour n8n - Upload
 * Gestion CORS et erreurs améliorée
 */

export const N8N_UPLOAD_URL = 'https://n8n.srv833062.hstgr.cloud/webhook/upload';

interface UploadResult {
  success: boolean;
  requestId: string;
  error?: string;
}

/**
 * Upload un fichier vers n8n
 * Gère les erreurs CORS et fournit des messages clairs
 */
export async function uploadToN8n(file: File, requestId: string): Promise<UploadResult> {
  console.log('📤 Uploading to n8n...', {
    fileName: file.name,
    fileSize: file.size,
    requestId,
    endpoint: N8N_UPLOAD_URL
  });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('requestId', requestId);

  try {
    const response = await fetch(N8N_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    try {
      const data = await response.json();
      console.log('✅ Upload successful:', data);
      return {
        success: true,
        requestId,
        ...data
      };
    } catch (parseError) {
      console.log('⚠️ Cannot parse response (CORS?), but status was OK');
      return {
        success: true,
        requestId
      };
    }

  } catch (error) {
    console.error('❌ Upload error:', error);

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(
        'Erreur CORS : Le serveur n8n doit autoriser ce domaine. ' +
        'Testez en local ou configurez n8n pour autoriser ' + window.location.origin
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Erreur d\'upload inconnue');
  }
}
