import {Platform} from "obsidian";
import * as React from "react";
import {useState} from "react";
import {getSettings, setSettings, updateSetting} from "src/context/sharedSettingsContext";
import {SyncSelected} from "src/settings/settings";
import {carddavGenericAdapter} from "src/sync/adapters/carddavGeneric";
import CarddavSettings from "src/ui/settings/components/carddavSettings";
import {oauth2} from "src/sync/auth";
import GoogleContactsSettings from "src/ui/settings/components/googleContactSettings";

const initCardavSettings = {
  addressBookUrl: "",
  username: "",
  password: "",
  authKey: ""
};

const initGoogleContactSettings = {
  clientId: "",
  clientSecret: "",
  accessToken: "",
  refreshToken: "",
};

export function SynchronizationSettings() {
  const isDisabled = Platform.isMobileApp;
  const [warning, setWarning] = useState('');
  const initSettings = getSettings();
  const [syncEnabled, setSyncEnabled] = useState<boolean>(initSettings.syncEnabled);
  const [syncSelected, setSyncSelected] = useState<SyncSelected>(initSettings.syncSelected);
  const [carddavSettings, setCarddavSettings] = useState({
    ...initCardavSettings,
    addressBookUrl: initSettings.CardDAV.addressBookUrl
  });
  const [googleContactSettings, setGoogleContactSettings] = useState({
    ...initGoogleContactSettings,
    clientId: initSettings.GoogleContact.clientId,
    clientSecret: initSettings.GoogleContact.clientSecret
  });

  const enableSync = async () => {
    if (!['CardDAV', 'GoogleContacts'].includes(syncSelected)) {
      setWarning(
        'Kindly select a synchronization method and provide the required connection information. Thank you!'
      );
      return;
    }

    switch (syncSelected) {
      case 'CardDAV':
        await enableCardDAV();
        break;

      case 'GoogleContacts':
        await enableGoogleContacts();
        break;
    }
  };

  const enableCardDAV = async () => {
    try {
      const result = await carddavGenericAdapter().checkConnectivity(carddavSettings);
      if (result.errorMessage) {
        setWarning(`failed to enable connection! ${result.errorMessage}. Please check your connection settings.`);
        return;
      }
      if (!(result.status >= 200 && result.status < 300)) {
        setWarning('failed to enable connection! unknown error. Please check your connection settings.');
        return;
      }

      const updateSetting = getSettings();
      updateSetting.syncEnabled = true;
      updateSetting.CardDAV = {
        addressBookUrl: carddavSettings.addressBookUrl,
        syncInterval: 900,
        authType: carddavSettings.authKey ? 'apikey' : 'basic',
        authKey: carddavSettings.authKey ? carddavSettings.authKey : btoa(`${carddavSettings.username}:${carddavSettings.password}`)
      };
      setCarddavSettings({
        ...initCardavSettings,
        addressBookUrl: updateSetting.CardDAV.addressBookUrl
      });
      setSyncEnabled(true);
      setWarning('');
      await setSettings(updateSetting);
    } catch (err: any) {
      setWarning(`failed to enable connection! ${err?.message || err || 'Unknown error'}.`);
    }
  }

  const enableGoogleContacts = async () => {
    try {
      await updateSetting('GoogleContact.clientId', googleContactSettings.clientId)
      await updateSetting('GoogleContact.clientSecret', googleContactSettings.clientSecret)
      const successExchanged = await oauth2.login(); // TODO: handle failure scenarios.
      await updateSetting('GoogleContact.accessToken', successExchanged.accessToken)
      await updateSetting('GoogleContact.refreshToken', successExchanged.refreshToken)
      console.log('aaaaaaaa');
    } catch (err: any) {
      setWarning(`failed to enable connection!`);
    }
  }


  const disableSync = async () => {
    setSyncEnabled(false);
    setSyncSelected('None');
    await updateSetting('syncEnabled', false)
  }

  React.useEffect(() => {
    updateSetting('syncSelected', syncSelected)
  }, [syncSelected]);

  React.useEffect(() => {
    if(isDisabled) {
      disableSync();
    }
  }, [isDisabled]);

  return (
    <>
      <div className="setting-item setting-item-heading">
        <div className="setting-item-info">
          <div className="setting-item-name">Contacts server synchronization settings</div>
          <div className="setting-item-description"></div>
        </div>
        <div className="setting-item-control"></div>
      </div>

      {isDisabled ? (
        <div className="callout" data-callout="info">
          <div className="callout-title">
            <div className="callout-title-inner">Contacts synchronization on mobile</div>
          </div>
          <div className="callout-content">
            <p>
              The mobile version of the VCF Contacts plugin can display and edit your contact files,
              but it can’t connect directly to contact servers like carddav, microsoft exchange, ldap or your adroid, ios contacts app.
            </p>
            <p>
              Obsidian Sync (or another vault sync tool) keeps your contact files aligned with the desktop devices.
              For synchronization with contact servers or your mobile device contacts, use the desktop version.
              You can read more in the project’s README file.
            </p>
          </div>
        </div>
      ) : (
        <>
          {!syncEnabled ? (
            <div className="callout" data-callout="warning">
              <div className="callout-title">
                <div className="callout-title-inner">Use synchronization carefully</div>
              </div>
              <div className="callout-content">
                <p>
                  Before enabling contact server sync, ensure you have a recent backup.
                  These features are best suited for users who have some technical experiance.
                </p>
              </div>
            </div>
          ) : null}
          <div className="setting-item js-keep">
            <div className="setting-item-info">
              <div className="setting-item-name">Synchronization</div>
              <div className="setting-item-description">
                {syncEnabled ? <div className="mod-success">CardDAV sync Enabled</div> : ''}
                <div className="mod-warning">{warning}</div>
              </div>
            </div>
            <div className="setting-item-control">
              {syncEnabled ?
                <button className="mod-destructive" onClick={disableSync}>Disable</button>
                :
                <button className="mod-cta" onClick={enableSync}>Enable</button>
              }
            </div>
          </div>
          <div className="setting-item js-keep">
            <div className="setting-item-info">
              <div className="setting-item-name">Sync method</div>
              <div className="setting-item-description">Choose how you want to synchronize your contacts.</div>
            </div>
            <div className="setting-item-control">
              <select
                className="dropdown"
                value={syncSelected}
                onChange={e => {
                  disableSync();
                  setSyncSelected(e.target.value as SyncSelected);
                }}>
                <option value="None">No synchronization</option>
                <option value="CardDAV">CardDAV address book</option>
                <option value="GoogleContacts">Google Contacts</option>
              </select>
            </div>
          </div>

          {syncSelected === "CardDAV" && (
            <CarddavSettings
              carddavSettings={carddavSettings}
              setCarddavSettings={setCarddavSettings}
            />
          )}
          {syncSelected === "GoogleContacts" && (
            <GoogleContactsSettings
              googleContactSettings={googleContactSettings}
              setGoogleContactSettings={setGoogleContactSettings}
            />
          )}
        </>
      )}
    </>
  )

}
