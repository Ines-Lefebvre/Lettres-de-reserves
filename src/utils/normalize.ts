/**
 * Utilitaires de normalisation des données
 */

/**
 * Convertit un objet avec des clés au format "section.field" 
 * en objet nested { section: { field: value } }
 * 
 * @param input - Objet avec clés au format "section.field"
 * @returns Objet nested
 * 
 * @example
 * dotObjectToNested({
 *   "employeur.siret": "12345678901234",
 *   "victime.nom": "MARTIN",
 *   "accident.date": "2025-01-15"
 * })
 * // Returns:
 * // {
 * //   employeur: { siret: "12345678901234" },
 * //   victime: { nom: "MARTIN" },
 * //   accident: { date: "2025-01-15" }
 * // }
 */
export function dotObjectToNested(input: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  
  for (const k of Object.keys(input || {})) {
    const [section, field] = k.split('.');
    if (!section || !field) continue;
    
    out[section] = out[section] || {};
    out[section][field] = input[k];
  }
  
  return out;
}

/**
 * Convertit un objet nested en objet avec clés au format "section.field"
 * (fonction inverse de dotObjectToNested)
 * 
 * @param input - Objet nested
 * @returns Objet avec clés au format "section.field"
 */
export function nestedToDotObject(input: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  
  for (const [section, fields] of Object.entries(input || {})) {
    if (typeof fields === 'object' && fields !== null && !Array.isArray(fields)) {
      for (const [field, value] of Object.entries(fields)) {
        out[`${section}.${field}`] = value;
      }
    } else {
      // Si ce n'est pas un objet nested, garder tel quel
      out[section] = fields;
    }
  }
  
  return out;
}

/**
 * Nettoie les données en supprimant les valeurs vides ou nulles
 * 
 * @param data - Données à nettoyer
 * @returns Données nettoyées
 */
export function cleanData(data: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data || {})) {
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = cleanData(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
}