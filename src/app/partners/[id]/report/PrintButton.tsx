'use client';

import { Button } from '@/design';

export function PrintButton() {
  return (
    <Button variant="compact" onClick={() => window.print()}>
      Print / Save PDF
    </Button>
  );
}
