import type { Customer, NewCustomer, AvgCarsConfig } from './Customer';

/** Repository interface — implemented by infrastructure layer. */
export interface CustomerRepository {
  save(customer: NewCustomer): Promise<Customer>;
  findAll(): Promise<Customer[]>;
  findById(id: string): Promise<Customer | null>;
  delete(id: string): Promise<void>;
  updateAvgCarsConfig(id: string, config: AvgCarsConfig): Promise<void>;
  updateDefaultTimezone(id: string, timezone: string): Promise<void>;
}
