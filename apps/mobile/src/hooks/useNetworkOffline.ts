import { useState } from "react";

export function useNetworkOffline(): boolean {
  const [isOffline] = useState(false);
  return isOffline;
}
