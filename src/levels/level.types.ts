export enum SuarecLevel {
  NUEVO = "Nuevo",
  ACTIVO = "Activo",
  PROFESIONAL = "Profesional",
  ELITE = "Elite",
}

export interface LevelMetrics {
  successfulContracts: number;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  cancelRate?: number | null;
}
