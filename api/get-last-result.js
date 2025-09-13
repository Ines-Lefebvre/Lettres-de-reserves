export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    const lastResult = global.lastN8nResult || null;
    
    if (lastResult) {
      const receivedAgo = Math.round((Date.now() - new Date(lastResult.receivedAt)) / 1000);
      
      return res.status(200).json({
        success: true,
        hasData: true,
        lastResult: lastResult,
        receivedAgo: `${receivedAgo} secondes`
      });
    } else {
      return res.status(200).json({
        success: true,
        hasData: false,
        message: 'Aucune donnée reçue de n8n'
      });
    }
  }

  return res.status(405).json({ error: 'Seul GET supporté' });
}