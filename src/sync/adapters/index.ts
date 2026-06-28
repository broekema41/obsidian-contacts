import { settings } from "src/context/sharedSettingsContext";
import { carddavGenericAdapter } from "src/sync/adapters/carddavGeneric";
import { googleContactsAdapter } from "src/sync/adapters/googleContactsAdapter";

export const adapters = {
  None: undefined,
  CardDAV: carddavGenericAdapter(),
  GoogleContacts: googleContactsAdapter()
}

export function getCurrentAdapter() {
  const setting = settings.value;
  if (!setting) return undefined;
  if (setting.syncSelected === "None") return undefined;
  return adapters[setting.syncSelected];
}
