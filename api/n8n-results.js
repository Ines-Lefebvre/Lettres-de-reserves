// pages/api/n8n-results.js (ou api/n8n-results.js selon la structure)
export default function handler(req, res) {
  // Headers CORS obligatoires
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Répondre aux requêtes OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - Test de l'endpoint
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'Endpoint actif',
      timestamp: new Date().toISOString(),
      message: 'Prêt à recevoir les données de n8n',
      endpoints: {
        receive: '/api/n8n-results (POST)',
        check: '/api/get-last-result (GET)'
      }
    });
  }

  // POST - Réception des données n8n
  if (req.method === 'POST') {
    try {
      console.log('🔥 DONNÉES REÇUES DE N8N:');
      console.log('📅 Timestamp:', new Date().toISOString());
      console.log('📦 Body:', JSON.stringify(req.body, null, 2));
      
      // Extraire résumé
      const summary = {
        sessionId: req.body?.sessionId || `auto_${Date.now()}`,
        status: req.body?.status || 'received',
        employeur: req.body?.summary?.employeur || req.body?.validationPayload?.declarations?.[0]?.supabaseData?.employeur_raison_sociale || 'non-renseigné',
        victime: req.body?.summary?.victime || req.body?.validationPayload?.declarations?.[0]?.supabaseData?.victime_nom || 'non-renseigné',
        completude: req.body?.summary?.completude || `${req.body?.validationPayload?.declarations?.[0]?.metadata?.completeness_rate || 0}%`,
        sourceFile: req.body?.sourceFile || req.body?.validationPayload?.sourceFile || 'fichier-inconnu',
        timestamp: new Date().toISOString()
      };

      // Sauvegarder en global (temporaire)
      global.lastN8nResult = {
        raw: req.body,
        summary: summary,
        receivedAt: new Date().toISOString()
      };

      console.log('✨ RÉSUMÉ:', summary);

      // Réponse JSON obligatoire
      return res.status(200).json({
        success: true,
        message: 'Données reçues et sauvegardées',
        sessionId: summary.sessionId,
        receivedFields: Object.keys(req.body || {}).length,
        summary: summary
      });

    } catch (error) {
      console.error('❌ ERREUR:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur traitement données',
        details: error.message
      });
    }
  }

  // Méthode non supportée
  return res.status(405).json({
    error: 'Méthode non supportée',
    allowed: ['GET', 'POST', 'OPTIONS']
  });
}