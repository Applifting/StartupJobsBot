import { StartupJobsPayload } from '../StartupJobs/webhookPayload';
import axios, { AxiosPromise } from 'axios';
import { SlackConfig } from './SlackConfig';
import * as url from 'url';
import { inspect } from 'util';
import { ISlackClient, RecruiteeOutcome } from './ISlackClient';
import { formatSuggestions } from '../Recruitee/OfferSuggester';
import { IErrorReporter } from '../Common/IErrorReporter';
import { sanitzeError } from '../Common/sanitizeError';
import { summarizeError } from '../Common/summarizeError';
import { SlackIntegrationCheckResult } from './SlackIntegrationCheckResult';
import { isAxiosError } from '../Common/isAxiosError';

export class SlackClient implements ISlackClient, IErrorReporter {
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    this.config = config;
  }

  public sendCandidateToSlack(
    candidate: StartupJobsPayload,
    outcome?: RecruiteeOutcome
  ): AxiosPromise<any> {
    const title = this.config.messageTitle || 'Nový kandidát!';
    const payload = {
      text: `${title}\n${candidate.name} chce být ${candidate.position}\n\n\n:phone: ${candidate.phone}\n:email: ${candidate.email}\n`,
      attachments: [
        {
          fallback: `${candidate.why}`,
          color: '#6B97CA',
          title: 'Proč já:question:',
          text: `${candidate.why}`,
        },
        {
          fallback: `${candidate.details}`,
          title: 'Odkazy',
          text: SlackClient.assembleLinks(candidate),
        },
        ...(outcome ? [SlackClient.describeOutcome(candidate, outcome)] : []),
      ],
    };
    return axios.post(this.config.webhookUrl, payload);
  }

  public static describeOutcome(candidate: StartupJobsPayload, outcome: RecruiteeOutcome) {
    const profile = outcome.candidateUrl ? ` <${outcome.candidateUrl}|Otevřít profil>` : '';
    const closest = outcome.suggestions?.length ? `\nNejblíž v Recruitee: ${formatSuggestions(outcome.suggestions)}.` : '';
    const fix =
      `\nOprava napořád: u nabídky na StartupJobs (č. ${candidate.offerID}, interní název: ` +
      `${candidate.internalPositionName || 'nevyplněn'}) dejte do interního názvu ID pozice z Recruitee.`;
    if (outcome.status === 'placed') {
      return {
        fallback: 'V Recruitee',
        color: '#73C37C',
        title: 'Recruitee :white_check_mark:',
        text: `Uložen k pozici *${outcome.offerTitle || '?'}*.${profile}`,
      };
    }
    if (outcome.status === 'fallback') {
      return {
        fallback: 'V Recruitee, v záložním talent poolu',
        color: '#FAC61F',
        title: 'Recruitee :warning:',
        text: `Pozici se nepodařilo spárovat, kandidát je v záložním talent poolu.${profile}${fix}${closest}`,
      };
    }
    const retry = outcome.willRetry ? ' Hodinová kontrola ho zkusí doplnit.' : ' Je potřeba ho přidat ručně.';
    return {
      fallback: 'Do Recruitee se nedostal',
      color: '#FF0000',
      title: 'Recruitee :x:',
      text: `Do Recruitee se nedostal: ${outcome.reason || 'neznámá chyba'}.${retry}${outcome.suggestions ? `${fix}${closest}` : ''}`,
    };
  }
  public sendNotice(text: string): Promise<any> {
    return axios.post(this.config.webhookUrl, { text });
  }

  public reportError(payload: string, error: Error): Promise<any> {
    const slackPayload = {
      text: `StartupJobsBot nedovedl zpracovat webhook! :white_frowning_face:\n`,
      attachments: [
        {
          fallback: ``,
          color: '#6B97CA',
          title: 'Payload :package:',
          text: payload,
        },
        {
          fallback: `Error`,
          color: '#FF0000',
          title: 'Error :warning:',
          text: inspect(sanitzeError(summarizeError(error))),
        },
      ],
    };
    return axios.post(this.config.webhookUrl, slackPayload);
  }

  public static assembleLinks(candidate: StartupJobsPayload): string {
    const links: string[] = [];
    if (candidate.files) {
      candidate.files.map((f) => {
        const name = decodeURIComponent(<string>url.parse(f, true).query!.file);
        links.push(`<${f}|${name}>`);
      });
    }
    if (candidate.linkedin) {
      links.push(`<${candidate.linkedin}|LinkedIn>`);
    }
    if (candidate.details) {
      links.push(
        `<${candidate.details}|${
          candidate.source ? 'GitHub' : 'StartupJobs'
        }>`
      );
    }
    const linksText = links.join(' | ');
    return linksText;
  }

  public async checkIntegration(): Promise<SlackIntegrationCheckResult> {
    try {
      const parsedUrl = url.parse(this.config.webhookUrl);
      if (
        parsedUrl.host == null ||
        parsedUrl.host?.includes('slack.com') == false ||
        parsedUrl.protocol != 'https:'
      ) {
        throw new Error('URL is not https or does not lead to slack domain');
      }
    } catch (e) {
      return SlackIntegrationCheckResult.INVALID_SLACK_URL;
    }
    try {
      const res = await axios.request({
        method: 'options',
        url: this.config.webhookUrl,
      });

      return SlackIntegrationCheckResult.OK;
    } catch (e) {
      if (isAxiosError(e)) {
        if (e.response) {
          const status = e.response.status;
          if (status >= 500 && status < 600) {
            return SlackIntegrationCheckResult.SLACK_NOT_AVAILABLE;
          }
          if (status == 403) {
            return SlackIntegrationCheckResult.FORBIDDEN;
          }
        }
      }
    }
    return SlackIntegrationCheckResult.UNKNOWN_ERROR;
  }
}
