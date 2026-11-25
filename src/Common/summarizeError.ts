import { isAxiosError } from './isAxiosError';

/**
 * Reduces an error to what is needed to debug it. An axios error carries the whole request, including the
 * candidate's personal data in the body and the access token in the headers; none of that belongs in a log or in Slack.
 */
export const summarizeError = (error: any): any => {
  if (error && typeof error === 'object' && isAxiosError(error)) {
    return {
      message: error.message,
      method: error.config?.method,
      url: error.config?.url,
      status: error.response?.status,
      response: error.response?.data,
    };
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error;
};
