import { SetMetadata } from "@nestjs/common";

// identificar las rutas públicas
export const IS_PUBLIC_KEY = "isPublic";

// rutas públicas
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
