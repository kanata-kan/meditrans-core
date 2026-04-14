export interface Patient {
  id: number;
  clientId: number;
  fullName: string;
  dateOfBirth: Date;
  phone: string;
  address: string;
  medicalNotes: string | null;
  createdAt: Date;
}

export interface CreatePatientInput {
  clientId: number;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  medicalNotes?: string;
}

export type UpdatePatientInput = Partial<CreatePatientInput>;
