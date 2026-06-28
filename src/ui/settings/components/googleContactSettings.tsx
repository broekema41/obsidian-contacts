import * as React from "react";

export interface GoogleContactSettingsInterface {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
}

interface GoogleContactSettingsProps {
  googleContactSettings: GoogleContactSettingsInterface;
  setGoogleContactSettings: (settings: GoogleContactSettingsInterface) => void;
}

export default function GoogleContactSettings({ googleContactSettings, setGoogleContactSettings }: GoogleContactSettingsProps) {

   return (
    <>
      <div className="setting-item">
        <div className="setting-item-info">
          <div className="setting-item-name">Client Id</div>
          <div className="setting-item-description">
            Oauth client id from google cloud
          </div>
        </div>
        <div className="setting-item-control">
          <input
            className="textfield"
            type="text"
            placeholder="ClientId"
            value={googleContactSettings.clientId}
            onChange={e => setGoogleContactSettings({ ...googleContactSettings, clientId: e.target.value })}
          />
        </div>
      </div>
      <div className="setting-item">
        <div className="setting-item-info">
          <div className="setting-item-name">Client Secret</div>
          <div className="setting-item-description">
            auth client secret from google cloud.
          </div>
        </div>
        <div className="setting-item-control">
          <input
            className="textfield"
            type="password"
            placeholder="clientSecret"
            value={googleContactSettings.clientSecret}
            onChange={e => setGoogleContactSettings({ ...googleContactSettings, clientSecret: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}
