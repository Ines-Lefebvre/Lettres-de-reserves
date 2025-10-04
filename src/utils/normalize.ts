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
    (out[section] ||= {})[field] = input[k];
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

/**
 * Normalise les nombres en supprimant les espaces et les virgules
 * Gère les formats comme "3, 4, 2, 5" → "34258" ou "1 234 567" → "1234567"
 *
 * @param value - Valeur à normaliser (string ou number)
 * @returns Valeur normalisée
 *
 * @example
 * normalizeNumber("3, 4, 2, 5") // "34258"
 * normalizeNumber("1 234 567") // "1234567"
 * normalizeNumber("12345") // "12345"
 */
export function normalizeNumber(value: string | number): string {
  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value !== 'string') {
    return String(value);
  }

  // Supprime tous les espaces, virgules et points (sauf le dernier point pour les décimales)
  return value.replace(/[\s,]/g, '');
}

/**
 * Normalise récursivement tous les champs numériques dans un objet
 *
 * @param data - Objet à normaliser
 * @param numericFields - Liste des champs qui doivent être normalisés (ex: ['siret', 'nir', 'telephone'])
 * @returns Objet avec les champs numériques normalisés
 */
export function normalizeNumericFields(
  data: Record<string, any>,
  numericFields: string[] = ['siret', 'nir', 'telephone', 'codePostal', 'numero']
): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data || {})) {
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      normalized[key] = normalizeNumericFields(value, numericFields);
    } else if (numericFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      normalized[key] = normalizeNumber(value);
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}