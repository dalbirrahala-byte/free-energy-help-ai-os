export type SupplierFuelType = "Electricity" | "Gas" | "Dual";

export type SupplierProductRateType = "Fixed" | "Flex" | "Renewable";

export type SupplierRow = {
  id: number;
  name: string;
  category: string | null;
  status: string;
  isPreferred: boolean;
  electricityAvailable: boolean;
  gasAvailable: boolean;
  riskLevel: string | null;
  marketSegment: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierProductRow = {
  id: number;
  supplierId: number;
  productName: string;
  fuelType: SupplierFuelType;
  rateType: SupplierProductRateType;
  minTermMonths: number | null;
  maxTermMonths: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SuppliersResult = {
  configured: boolean;
  suppliers: SupplierRow[];
};

export type SupplierProductsResult = {
  configured: boolean;
  products: SupplierProductRow[];
};
