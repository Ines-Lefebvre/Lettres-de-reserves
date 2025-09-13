// Endpoint principal pour recevoir les données de n8n
export default function handler(req, res) {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Gestion des requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Seules les requêtes POST sont acceptées
  if (req.method !== 'POST') {
    console.log(`❌ Méthode ${req.method} non autorisée sur /api/n8n-results`);
    return res.status(405).json({ 
      error: 'Méthode non autorisée', 
      allowedMethods: ['POST'] 
    });
  }

  try {
    // Récupération des données
    const receivedData = req.body;
    const timestamp = new Date().toISOString();
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';

    // Logs détaillés en console
    console.log('\n🔄 ===== DONNÉES REÇUES DE N8N =====');
    console.log(`📅 Timestamp: ${timestamp}`);
    console.log(`🌐 IP Client: ${clientIP}`);
    console.log(`🖥️  User-Agent: ${userAgent}`);
    console.log(`📊 Taille des données: ${JSON.stringify(receivedData).length} caractères`);
    console.log('\n📋 DONNÉES COMPLÈTES:');
    console.log(JSON.stringify(receivedData, null, 2));
    console.log('\n🔍 RÉSUMÉ EXTRAIT:');
    
    // Extraction du résumé
    const summary = {
      sessionId: receivedData?.sessionId || 'Non défini',
      status: receivedData?.status || 'Non défini',
      employeur: receivedData?.summary?.employeur || receivedData?.employeur || 'Non défini',
      victime: receivedData?.summary?.victime || receivedData?.victime || 'Non défini',
      completude: receivedData?.summary?.completude || receivedData?.completude || 'Non défini',
      typeFormulaire: receivedData?.summary?.typeFormulaire || receivedData?.typeFormulaire || 'Non défini',
      sourceFile: receivedData?.sourceFile || 'Non défini'
    };

    console.log(JSON.stringify(summary, null, 2));
    console.log('🔄 ================================\n');

    // Sauvegarde en mémoire globale
    global.lastN8nResult = {
      data: receivedData,
      summary: summary,
      receivedAt: timestamp,
      clientInfo: {
        ip: clientIP,
        userAgent: userAgent
      }
    };

    // Réponse de confirmation
    const response = {
      success: true,
      message: 'Données reçues et traitées avec succès',
      receivedAt: timestamp,
      dataSize: JSON.stringify(receivedData).length,
      summary: summary
    };

    console.log(`✅ Réponse envoyée à n8n: ${JSON.stringify(response)}`);
    
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erreur lors du traitement des données n8n:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}