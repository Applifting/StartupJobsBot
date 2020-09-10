import { getConfig, Config } from '../config';
import { deepRegexReplace } from './deepRegexReplace';

export const sanitzeError = <T>(error: any, getConfigFn: () => Config = getConfig) => {
  const config = getConfigFn();
  const toStrip = [];
  if (config.recruitee?.accessToken) toStrip.push(config.recruitee?.accessToken);
  if (config.slack?.webhookUrl) toStrip.push(config.slack?.webhookUrl);
  return deepRegexReplace(error, toStrip);
};
