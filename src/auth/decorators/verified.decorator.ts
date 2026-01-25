import { SetMetadata } from "@nestjs/common";

export const VERIFIED_KEY = "verifiedRequired";

export const Verified = (message?: string) =>
  SetMetadata(VERIFIED_KEY, { message });
