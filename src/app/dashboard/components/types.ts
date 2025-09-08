export type FarmerProfile = {
  id: string;
  farmerName: string;
  phone: string;
  gps?: string;
  landSize?: string;
  cropType?: string;
  soilType?: string;
  irrigation?: string;
  createdAt: number;
};

export type ActivityLog = {
  id: string;
  farmerId: string;
  type: string;
  notes?: string;
  photoUrl?: string;
  createdAt: number;
};

export type AreaUnit = "acre" | "hectare" | "cent" | "sqft" | "sqm";

export const unitToSqMeters: Record<AreaUnit, number> = {
  acre: 4046.8564224,
  hectare: 10000,
  cent: 40.468564224,
  sqft: 0.09290304,
  sqm: 1,
};

export type CropType = "Empty" | "Paddy" | "Banana" | "Pepper" | "Coconut" | "Other";

export type Land = {
  id: string;
  name: string; // e.g., North Field
  location: string; // gps or manual
  sizeValue: number;
  sizeUnit: AreaUnit;
  // Grid selection stores number of selected cells
  gridSelectedCells: number;
  gridTotalCells: number;
  crop: CropType;
  createdAt: number;
};


