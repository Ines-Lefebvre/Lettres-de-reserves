import { supabase } from './supabaseClient';

export async function getOcrResultIdOrThrow(requestId: string) {
  // 1) Regarder dans le payload mémoire
  const raw = sessionStorage.getItem('ocr_payload');
  if (raw) {
    try {
      const p = JSON.parse(raw);
      const cand =
        p?.ocr_result_id ||
        p?.ocrResultId ||
        p?.metadata?.ocr_result_id ||
        p?.metadata?.ocrResultId;
      if (cand) return cand as string;
    } catch {}
  }

  // 2) Sinon, requête côté base par request_id (RLS lecture requise)
  const { data, error } = await supabase
    .from('ocr_results')
    .select('id')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data?.[0]?.id) throw new Error('Impossible de retrouver ocr_result_id');
  return data[0].id as string;
}