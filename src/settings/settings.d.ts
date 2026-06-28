
export type AuthType = "basic" | "apikey";
export type SyncSelected = "None" | "CardDAV" | "GoogleContacts";

export interface ContactsPluginSettings {
  contactsFolder: string;
  defaultHashtag: string;
  processors: ProcessorsSettings
  syncSelected: SyncSelected;
  syncEnabled: boolean;
  groupInsights: boolean;
  CardDAV: CardDavSyncSettings;
  GoogleContact: GoogleContactSyncSettings;
  createFieldsKeys: string[]
}


interface CardDavSyncSettings {
  addressBookUrl: string;
  syncInterval: number;
  authKey: string;
  authType: AuthType;
}

interface GoogleContactSyncSettings {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
}

interface ProcessorsSettings {
  [key: string]: string|boolean;
}


