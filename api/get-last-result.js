// Endpoint pour récupérer le dernier résultat reçu de n8n
export default function handler(req, res) {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Gestion des requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Seules les requêtes GET sont acceptées
  if (req.method !== 'GET') {
    console.log(`❌ Méthode ${req.method} non autorisée sur /api/get-last-result`);
    return res.status(405).json({ 
      error: 'Méthode non autorisée', 
      allowedMethods: ['GET'] 
    });
  }

  try {
    // Vérification de l'existence de données
    if (!global.lastN8nResult) {
      console.log('ℹ️  Aucun résultat n8n disponible');
      return res.status(200).json({
        hasData: false,
        message: 'Aucun résultat n8n reçu pour le moment',
        timestamp: new Date().toISOString()
      });
    }

    // Calcul du temps écoulé
    const now = new Date();
    const receivedAt = new Date(global.lastN8nResult.receivedAt);
    const elapsedMs = now - receivedAt;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const elapsedHours = Math.floor(elapsedMinutes / 60);

    let elapsedTime;
    if (elapsedHours > 0) {
      elapsedTime = `${elapsedHours}h ${elapsedMinutes % 60}m ${elapsedSeconds % 60}s`;
    } else if (elapsedMinutes > 0) {
      elapsedTime = `${elapsedMinutes}m ${elapsedSeconds % 60}s`;
    } else {
      elapsedTime = `${elapsedSeconds}s`;
    }

    // Préparation de la réponse
    const response = {
      hasData: true,
      summary: global.lastN8nResult.summary,
      receivedAt: global.lastN8nResult.receivedAt,
      elapsedTime: elapsedTime,
      elapsedMs: elapsedMs,
      clientInfo: global.lastN8nResult.clientInfo,
      fullData: global.lastN8nResult.data,
      retrievedAt: new Date().toISOString()
    };

    console.log(`📤 Dernier résultat n8n récupéré (reçu il y a ${elapsedTime})`);
    
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erreur lors de la récupération du dernier résultat:', error);
    
    res.status(500).json({
      hasData: false,
      error: 'Erreur interne du serveur',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}