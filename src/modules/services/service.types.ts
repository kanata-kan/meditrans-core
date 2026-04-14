import type { ServiceStatus, UrgencyLevel, StaffType } from "@/lib/constants";

export interface Service {
  id: number;
  patientId: number;
  clientId: number;
  catalogCode: string;
  status: ServiceStatus;
  urgency: UrgencyLevel;
  fromLocation: string;
  toLocation: string;
  distanceKm: number;
  isRoundTrip: boolean;
  staffType: StaffType | null;
  durationHours: number | null;
  scheduledAt: Date;
  completedAt: Date | null;
  notes: string | null;
  createdById: number;
  createdAt: Date;
}

export interface CreateServiceInput {
  patientId: number;
  clientId: number;
  catalogCode: string;
  urgency: UrgencyLevel;
  fromLocation: string;
  toLocation: string;
  distanceKm: number;
  isRoundTrip: boolean;
  staffType?: StaffType;
  durationHours?: number;
  scheduledAt: string;
  notes?: string;
  selectedModifiers: string[];
  manualOverride?: {
    total: number;
    reason: string;
  };
}

export interface UpdateServiceStatusInput {
  status: ServiceStatus;
}
