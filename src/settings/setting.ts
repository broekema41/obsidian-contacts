import { ContactsPluginSettings } from "src/settings/settings";

export const DEFAULT_SETTINGS: ContactsPluginSettings = {
  contactsFolder: '',
  defaultHashtag: '',
  processors: {},
  syncSelected: 'None',
  syncEnabled: false,
  groupInsights: true,
  CardDAV: {
    addressBookUrl: '',
    syncInterval: 900,
    authKey: '',
    authType: 'apikey'
  },
  GoogleContact: {
    clientId: '',
    clientSecret: '',
    accessToken: '',
    refreshToken: ''
  },
  createFieldsKeys:  [
    "N.PREFIX",
    "N.GN",
    "N.MN",
    "N.FN",
    "N.SUFFIX",
    "TEL[CELL]",
    "TEL[HOME]",
    "TEL[WORK]",
    "EMAIL[HOME]",
    "EMAIL[WORK]",
    "BDAY",
    "PHOTO",
    "ADR[HOME].STREET",
    "ADR[HOME].LOCALITY",
    "ADR[HOME].POSTAL",
    "ADR[HOME].COUNTRY",
    "URL[WORK]",
    "ORG",
    "ROLE",
    "CATEGORIES"
  ]
}

