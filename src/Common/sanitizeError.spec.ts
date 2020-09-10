import { sanitzeError } from './sanitizeError';
import { AppError } from './AppError';
import { Dictionary } from 'lodash';

describe('sanitizeError', () => {
  interface ErrorWithMetadata extends AppError {
    extraMetaData: Dictionary<any>;
  }

  it('strips sensistive values from config in the error passed in it', () => {
    const recruiteeAT = 'ABDEFGH4546521AAA123123';
    const hookUrl = 'https://hooks.slack.com/services/T06SD45654/RD45642/ABDaZ894521321';
    let error = new AppError(400, `Bad thing occured. AccessToken was ${recruiteeAT}`) as ErrorWithMetadata;
    error.extraMetaData = {
      foo: 'bar',
      hookUrl: hookUrl,
    };
    const sanitizedError = sanitzeError(error, () => {
      return {
        server: {
          logErrors: true,
          logRequests: true,
          logPayloads: true,
          webhookPath: '/some/path',
          port: 3000,
        },
        recruitee: {
          accessToken: recruiteeAT,
          companyDomain: 'Applifting',
        },
        slack: {
          webhookUrl: hookUrl,
        },
      };
    });

    expect(sanitizedError.message).toEqual(`Bad thing occured. AccessToken was [REDACTED]`);
    expect(sanitizedError.extraMetaData).toEqual({
      foo: 'bar',
      hookUrl: '[REDACTED]',
    });
  });
});
