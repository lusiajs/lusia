import { networkInterfaces } from "node:os";

/** The first IPv4 address that other devices on the network can reach. */
export function networkAddress(): string | null {
  for (const addresses of Object.values(networkInterfaces())) {
    const external = addresses?.find((address) => address.family === "IPv4" && !address.internal);
    if (external) return external.address;
  }
  return null;
}
