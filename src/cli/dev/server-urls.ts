import type { HeaderUrl } from "../log/dev-header.ts";
import { networkAddress } from "./network-address.ts";

export function serverUrls(url: URL): HeaderUrl[] {
  const address = networkAddress();
  const local = { label: "Local", url: url.href };
  // The dev server binds all interfaces, so the LAN address reaches it.
  if (!address) return [local];
  return [local, { label: "Network", url: `http://${address}:${url.port}/` }];
}
