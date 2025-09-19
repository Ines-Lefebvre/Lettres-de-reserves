import { supabase } from './supabaseClient';

export async function getOcrResultIdFromRequestId(requestId: string) {
  // 1) Essayer depuis le payload en mémoire
  const raw = sessionStorage.getItem('ocr_payload');
  if (raw) {
    try {
      const p = JSON.parse(raw);
      const cand =
        p?.ocr_result_id ||
        p?.ocrResultId ||
        p?.metadata?.ocr_result_id ||
        p?.metadata?.ocrResultId;
      if (cand) return String(cand);
    } catch {}
  }

  // 2) upload_id depuis uploads.request_id (unique)
  const { data: ups, error: e1 } = await supabase
    .from('uploads')
    .select('id')
    .eq('request_id', requestId)
    .limit(1);
  if (e1) throw new Error(`uploads lookup: ${e1.message}`);
  const uploadId = ups?.[0]?.id;
  if (!uploadId) throw new Error('Aucun upload pour ce request_id.');

  // 3) dernier ocr_results lié à cet upload
  const { data: ocrs, error: e2 } = await supabase
    .from('ocr_results')
    .select('id, created_at')
    .eq('upload_id', uploadId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (e2) throw new Error(`ocr_results lookup: ${e2.message}`);
  const ocrId = ocrs?.[0]?.id;
  if (!ocrId) throw new Error('Aucun ocr_result lié à cet upload.');
  return ocrId as string;
}

// Fonction legacy pour compatibilité
export async function getOcrResultIdOrThrow(requestId: string) {
  return getOcrResultIdFromRequestId(requestId);
}