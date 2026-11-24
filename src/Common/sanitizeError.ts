import { getConfig, Config } from '../config';
import { deepRegexReplace } from './deepRegexReplace';

export const sanitzeError = <T>(error: any, getConfigFn: () => Pick<Config, 'recruitee' | 'slack' | 'startupJobsApi'> = getConfig) => {
  const config = getConfigFn();
  const toStrip = [];
  if (config.recruitee?.accessToken) toStrip.push(config.recruitee?.accessToken);
  if (config.slack?.webhookUrl) toStrip.push(config.slack?.webhookUrl);
  if (config.startupJobsApi?.apiToken) toStrip.push(config.startupJobsApi.apiToken);
  return deepRegexReplace(error, toStrip);
};
