'use server';

import { revalidatePath } from 'next/cache';
import { PostgresPartnerRepository } from '@/infrastructure/db/PostgresPartnerRepository';

export async function addPartner(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name is required.');
  if (trimmed.length > 200) throw new Error('Name must be 200 characters or fewer.');
  const repo = new PostgresPartnerRepository();
  await repo.save({ name: trimmed, logo: null, logoMimeType: null, dataFilter: null, defaultTimezone: null });
  revalidatePath('/lite');
}

export async function deletePartner(id: string): Promise<void> {
  const repo = new PostgresPartnerRepository();
  await repo.delete(id);
  revalidatePath('/lite');
}
