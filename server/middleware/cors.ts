import { Request, Response, NextFunction } from 'express';

/**
 * Middleware CORS avec allowlist
 * 
 * Comportement :
 * - OPTIONS autorisé → 204 avec headers CORS
 * - OPTIONS refusé → 403 JSON
 * - POST/GET autorisé → headers CORS + next()
 * - POST/GET refusé → 403 JSON
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = allowedOriginsEnv
    .split(',')
    .map(o => o.trim())
    .filter(o => o.length > 0);

  // Vérifier si l'origin est dans l'allowlist
  const isAllowed = origin && allowedOrigins.includes(origin);

  // Si l'origin n'est pas autorisée, renvoyer 403
  if (!isAllowed && origin) {
    res.status(403).json({ error: 'origin not allowed' });
    return;
  }

  // Si autorisé, définir les headers CORS
  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    if (isAllowed) {
      res.status(204).end();
    } else {
      res.status(403).json({ error: 'origin not allowed' });
    }
    return;
  }

  // Passer au middleware suivant pour les autres méthodes
  next();
}
