import { StartupJobsPayload } from '../StartupJobs/webhookPayload';
import { CandidateAnonymizer } from './CandidateAnonymizer';
import { CandidateMatcher } from '../Recruitee/CandidateMatcher';
import { AppError } from '../Common/AppError';
import { IRecruiteeClient } from '../Recruitee/IRecruiteeClient';
import { ISlackClient } from '../Slack/ISlackClient';
import { IEmailClient } from '../Email/IEmailClient';
import { AxiosResponse } from 'axios';

/**
 * Takes normalized StartupJobs payload and sends it to Slack and Recruitee
 */
export class CandidateProcessor {
  private slack?: ISlackClient;
  private recruitee?: IRecruiteeClient;
  private email?: IEmailClient;

  constructor(slack?: ISlackClient, recruitee?: IRecruiteeClient, email?: IEmailClient) {
    this.slack = slack;
    this.recruitee = recruitee;
    this.email = email;
    if (!this.recruitee && !this.slack && !this.email) {
      throw new Error('Neither Slack, Recruitee, or Email are enabled. Aborting');
    }
  }

  public async process(payload: StartupJobsPayload, params?: Object) {
    const tags: string[] = Object.values(params);
    const anonymizer = new CandidateAnonymizer();

    if (this.slack) {
      await this.slack.sendCandidateToSlack(payload.gdpr_accepted ? payload : anonymizer.anonymize(payload));
    }

    let recruiteeResponse: AxiosResponse<any>;
    if (this.recruitee) {
      const matcher = new CandidateMatcher();
      const offers = await this.recruitee.getOffers();
      const offerId = matcher.matchCandidateToOfferId(payload, offers);
      if (offerId) {
        recruiteeResponse = await this.recruitee.createCandidateInRecruitee(
          offerId,
          payload,
        );

        await this.recruitee.addCandidateTags(recruiteeResponse.data.candidate.id, tags);
      } else {
        throw new AppError(500, `Unable to match ${payload.position} (${payload.internalPositionName}) to any Recruitee offer`);
      }
    }

    if (this.email && recruiteeResponse) {
      await this.email.sendCandidateEmail(payload, recruiteeResponse);
    }
  }
}
