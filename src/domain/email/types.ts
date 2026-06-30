export type Recurrence = 'once' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
export type ScheduleStatus = 'active' | 'cancelled';
export type LogStatus = 'sent' | 'failed';

export interface EmailContact {
  id: string;
  customerId: string;
  storeName: string | null;
  email: string;
  name: string | null;
  createdAt: Date;
}

export interface NewEmailContact {
  customerId: string;
  storeName: string | null;
  email: string;
  name: string | null;
}

export interface EmailSchedule {
  id: string;
  customerId: string;
  storeName: string | null;
  scheduledAt: Date;
  recurrence: Recurrence;
  timezone: string | null;
  status: ScheduleStatus;
  createdAt: Date;
}

export interface NewEmailSchedule {
  customerId: string;
  storeName: string | null;
  scheduledAt: Date;
  recurrence: Recurrence;
  timezone: string | null;
}

export interface EmailLogEntry {
  id: string;
  customerId: string;
  storeName: string | null;
  scheduleId: string | null;
  sentAt: Date;
  recipientCount: number;
  status: LogStatus;
  error: string | null;
}
