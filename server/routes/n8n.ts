import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Route POST /api/validation-created
 * Proxy vers le webhook n8n de validation
 */
router.post('/validation-created', async (req: Request, res: Response) => {
  const webhookUrl = process.env.N8N_VALIDATION_WEBHOOK;

  if (!webhookUrl) {
    res.status(500).json({
      error: 'configuration_error',
      message: 'N8N_VALIDATION_WEBHOOK not configured'
    });
    return;
  }

  try {
    // Préparer les headers à transférer
    const headers: Record<string, string> = {
      'Content-Type': req.headers['content-type'] || 'application/json',
    };

    // Transférer certains headers utiles si présents
    if (req.headers['x-request-id']) {
      headers['X-Request-Id'] = req.headers['x-request-id'] as string;
    }
    if (req.headers['user-agent']) {
      headers['User-Agent'] = req.headers['user-agent'] as string;
    }

    // Faire la requête vers n8n
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });

    // Récupérer le body de la réponse
    const contentType = response.headers.get('content-type') || '';
    let responseData: any;

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Transférer les headers CORS de n8n si présents
    const corsHeaders = ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers'];
    corsHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    // Retourner la réponse de n8n avec le même statut
    res.status(response.status).json(responseData);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(502).json({
      error: 'proxy_error',
      message: 'Failed to reach n8n webhook',
      details: errorMessage
    });
  }
});

export default router;
