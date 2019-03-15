export interface ServerConfig {
  port: number;
  webhookPath: string;
  logPayloads: boolean;
  logRequests: boolean;
  logErrors: boolean;
}
