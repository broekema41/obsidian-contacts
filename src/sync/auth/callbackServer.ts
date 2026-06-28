

export interface OAuthCallbackData {
  code?: string;
  state?: string;
  error?: string;
}

type Request = {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type Response = {
  writeHead(status: number, headers?: Record<string, string>): void;
  end(data?: string): void;
};

const CALLBACK_PORT = 37288;

const protocol = 'node:http';
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-require-imports
const http = require(protocol);
// @ts-ignore
let server: http.Server | undefined;

export function startServer(
  callback: (data: OAuthCallbackData) => void
): void {

  server = http.createServer((req: Request , res: Response) => {

    const url = new URL(
      req.url ?? "",
      `http://127.0.0.1:${CALLBACK_PORT}`
    );

    res.writeHead(200, {
      "Content-Type": "text/html",
    });

    res.end(`
      <html>
        <body>
          <h2>Authentication callback received</h2>
          <p>You may close this window.</p>
        </body>
      </html>
    `);
    
    callback({
      code: url.searchParams.get("code") ?? undefined,
      state: url.searchParams.get("state") ?? undefined,
      error: url.searchParams.get("error") ?? undefined,
    });
  });

  server.listen(CALLBACK_PORT, "127.0.0.1");
}

export function stopServer(): void {

  if (!server) {
    return;
  }

  server.close();
  server = undefined;
}
