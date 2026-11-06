/**
 * Small display helpers shared by section pages.
 */
import { t } from '../i18n/ui';
import type { Lang } from './schema';

/**
 * Localise a period string from the approved data ("2017–present",
 * "In progress", "2012–2015") without changing its dates. Arabic periods
 * should be rendered with dir="auto" (not forced LTR) so "2017–الآن" reads
 * naturally right-to-left.
 */
export function formatPeriod(period: string | null | undefined, lang: Lang): string | null {
  if (!period) return null;
  const ui = t(lang);
  return period.replace(/\bpresent\b/i, ui.present).replace(/^in progress$/i, ui.inProgress);
}

/** Attributes for a period element: LTR on English pages, auto on Arabic ones. */
export const periodAttrs = (lang: Lang) => (lang === 'ar' ? { dir: 'auto' } : { class: 'ltr' });
