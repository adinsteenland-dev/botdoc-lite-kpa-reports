import type { Partner, NewPartner } from './Partner';

export interface PartnerRepository {
  save(partner: NewPartner): Promise<Partner>;
  findAll(): Promise<Partner[]>;
  findById(id: string): Promise<Partner | null>;
  delete(id: string): Promise<void>;
}
