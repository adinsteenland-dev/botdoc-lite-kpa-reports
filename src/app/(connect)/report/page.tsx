import { redirect } from 'next/navigation';

/** Legacy route — replaced by /customers/[id]/report in Phase 1. */
export default function LegacyReportPage() {
  redirect('/');
}
