import { StartupJobsPayload } from '../StartupJobs/webhookPayload';
import { CandidateAnonymizer } from './CandidateAnonymizer';
import { CandidateMatcher } from '../Recruitee/CandidateMatcher';
import { AppError } from '../Common/AppError';
import { IRecruiteeClient } from '../Recruitee/IRecruiteeClient';
import { ISlackClient } from '../Slack/ISlackClient';

/**
 * Takes normalized StartupJobs payload and sends it to Slack and Recruitee
 */
export class CandiateProcessor {
  private slack?: ISlackClient;
  private recruitee?: IRecruiteeClient;

  constructor(slack?: ISlackClient, recruitee?: IRecruiteeClient) {
    this.slack = slack;
    this.recruitee = recruitee;
    if (!this.recruitee && !this.slack) {
      throw new Error('Neither Slack or Recruitee are enabled. Aborting');
    }
  }

  public async process(payload: StartupJobsPayload, params?: Object) {
    const tags: string[] = Object.values(params);
    const anonymizer = new CandidateAnonymizer();

    if (this.slack) {
      await this.slack.sendCandidateToSlack(payload.gdpr_accepted ? payload : anonymizer.anonymize(payload));
    }
    if (this.recruitee) {
      const matcher = new CandidateMatcher();
      const offers = await this.recruitee.getOffers();
      const offerId = matcher.matchCandidateToOfferId(payload, offers);
      if (offerId) {
        const createCandidate = await this.recruitee.createCandidateInRecruitee(
          offerId,
          payload,
        );

        await this.recruitee.addCandidateTags(createCandidate.data.candidate.id, tags);

      } else {
        throw new AppError(500, `Unable to match ${payload.position} (${payload.internalPositionName}) to any Recruitee offer`);
      }
    }
  }
}
