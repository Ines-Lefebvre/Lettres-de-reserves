import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { corsMiddleware } from './middleware/cors';
import n8nRoutes from './routes/n8n';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware pour parser le JSON
app.use(express.json());

// Appliquer le middleware CORS sur toutes les routes /api/*
app.use('/api', corsMiddleware);

// Monter les routes n8n
app.use('/api', n8nRoutes);

// Route de health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ReservAT API Server'
  });
});

// Route 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'not_found',
    message: 'Route not found'
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 ReservAT API Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 CORS allowlist configured`);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
