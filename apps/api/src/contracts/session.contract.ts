import type { MixMatchError } from "@mixmatch/types";

export type UnauthorizedErrorResponse = {
  success: false;
  error: MixMatchError;
};

