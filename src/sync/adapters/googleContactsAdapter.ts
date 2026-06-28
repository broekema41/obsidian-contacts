import { getSettings } from "src/context/sharedSettingsContext";
import { ContactsPluginSettings } from "src/settings/settings";
import { VCardMeta, VCardRaw } from "src/sync/adapters/adapter";
import { AdapterInterface } from "src/sync/adapters/adapterInterface";
import { CarddavSettingsInterface } from "src/ui/settings/components/carddavSettings";
import { AppHttpResponse, PlatformHttpClient } from "src/util/platformHttpClient";
import { fnOutOfString, uidOutOfString } from "src/util/vcard";


export function googleContactsAdapter(): AdapterInterface {

  const getAuthHeader = (settings:ContactsPluginSettings) => {
    if (settings.CardDAV.authType === 'apikey') {
      return `Bearer ${settings.CardDAV.authKey}`;
    } else {
      return `Basic ${settings.CardDAV.authKey}`;
    }
  }

  const checkConnectivity = async (settings: CarddavSettingsInterface): Promise<AppHttpResponse> =>  {
    const headers = { Authorization : ''};
    if (settings.authKey) {
      headers.Authorization = `Bearer ${settings.authKey}`;
    } else {
      headers.Authorization = 'Basic ' + btoa(settings.username + ":" + settings.password);
    }
    return await PlatformHttpClient.request({
        url: settings.addressBookUrl,
        method: 'OPTIONS',
        headers,
      });
  }

  const isVcfNode = (response: Element): boolean => {
    const href = response.querySelector('href')?.textContent;
    const successPropstat = Array.from(response.querySelectorAll('propstat')).find(
      propstat => propstat.querySelector('status')?.textContent?.includes('200 OK')
    );

    if (!successPropstat || !href || !href.endsWith('.vcf')) {
      return false;
    }

    return true;
  };


  const getMetaByUid = async (uid: string): Promise<VCardMeta | AppHttpResponse | undefined> => {
    const settings = getSettings();
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<C:addressbook-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
  <D:prop>
    <D:getetag />
    <D:getlastmodified />
    <D:resourcetype />
    <C:address-data>
      <C:prop name="UID"/>
      <C:prop name="FN"/>
    </C:address-data>
  </D:prop>
  <C:filter>
    <C:prop-filter name="UID">
      <C:text-match match-type="contains">${uid}</C:text-match>
    </C:prop-filter>
  </C:filter>
</C:addressbook-query>`;

    const res = await PlatformHttpClient.request({
      url: settings.CardDAV.addressBookUrl,
      method: 'REPORT',
      headers: {
        'Authorization': getAuthHeader(settings),
        'Content-Type': 'application/xml',
        'Depth': '1'
      },
      body
    });

    if(res.errorMessage) {
      return res;
    }

    const parser = new DOMParser();
    const xml = parser.parseFromString(res.data, 'application/xml');
    const responses = xml.querySelectorAll('response');

    if(!responses || responses.length !== 1) {
      return;
    }

    const response = responses[0];

    if (!isVcfNode(response)) {
      return;
    }

    const href = response.querySelector('href')?.textContent || '';
    const etag = response.querySelector('getetag')?.textContent || '';
    const lastModified = response.querySelector('getlastmodified')?.textContent || '';
    const adressData = response.querySelector('address-data')?.textContent || '';

    if (!href) {
      return;
    }

    return {
      href,
      etag: etag?.replace(/"/g, '') || '', // Remove quotes from etag
      lastModified: lastModified ? new Date(lastModified) : new Date(),
      uid: uidOutOfString(adressData),
      fn: fnOutOfString(adressData)
    }
  }


  const getMetaList = async (): Promise<VCardMeta[] | AppHttpResponse> => {
    const settings = getSettings();
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<C:addressbook-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
  <D:prop>
    <D:getetag />
    <D:getlastmodified />
    <D:resourcetype />
    <C:address-data>
      <C:prop name="UID"/>
      <C:prop name="FN"/>
    </C:address-data>
  </D:prop>
</C:addressbook-query>`;

    const res = await PlatformHttpClient.request({
      url: settings.CardDAV.addressBookUrl ,
      method: 'REPORT',
      headers: {
        'Authorization': getAuthHeader(settings),
        'Content-Type': 'application/xml',
        'Depth': '1'
      },
      body
    });

    if(res.errorMessage) {
      return res;
    }

    const parser = new DOMParser();
    const xml = parser.parseFromString(res.data, 'application/xml');

    const responses = xml.querySelectorAll('response');
    const vcardMetas: VCardMeta[] = [];

    responses.forEach(response => {
      if(!response) {
        return;
      }

      if (!isVcfNode(response)) {
        return;
      }

      const href = response.querySelector('href')?.textContent;
      const etag = response.querySelector('getetag')?.textContent;
      const lastModified = response.querySelector('getlastmodified')?.textContent;
      const adressData = response.querySelector('address-data')?.textContent || '';

      if (!href) {
        return;
      }

      vcardMetas.push({
        href,
        etag: etag?.replace(/"/g, '') || '', // Remove quotes from etag
        lastModified: lastModified ? new Date(lastModified) : new Date(),
        uid: uidOutOfString(adressData),
        fn: fnOutOfString(adressData)
      });
    });

    return vcardMetas;
  }


  const pull = async (href: string): Promise<VCardRaw | AppHttpResponse> => {
    const settings = getSettings();
    const vcfUrl = new URL(href, settings.CardDAV.addressBookUrl).toString();
    const res = await PlatformHttpClient.request({
      url: vcfUrl,
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(settings),
        ['Accept']: 'text/vcard; version=4.0; charset=utf-8;'
      }
    });

    if(res.errorMessage) {
      return res;
    }

    return {
      uid: uidOutOfString(res.data),
      raw: res.data,
    }
  }

  const push = async (vcard: VCardRaw): Promise<AppHttpResponse> => {
    const settings = getSettings();
    const vcfUrl = settings.CardDAV.addressBookUrl + `/${vcard.uid}.vcf`;
    return await PlatformHttpClient.request({
      url: vcfUrl,
      method: 'PUT',
      body: vcard.raw,
      headers: {
        ['Authorization']: getAuthHeader(settings),
        ['Content-Type']: 'text/vcard; version=4.0; charset=utf-8;'
      }
    });
  }

  const deleteContact = async (href: string): Promise<AppHttpResponse> => {
    const settings = getSettings();
    const vcfUrl = new URL(href, settings.CardDAV.addressBookUrl).toString();
    return await PlatformHttpClient.request({
      url: vcfUrl,
      method: 'DELETE',
      headers: {
        Authorization: getAuthHeader(settings),
      }
    });
  }

  return {
    checkConnectivity,
    getMetaByUid,
    getMetaList,
    pull,
    push,
    delete: deleteContact
  };

}
