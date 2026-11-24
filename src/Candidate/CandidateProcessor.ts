import { StartupJobsPayload } from '../StartupJobs/webhookPayload';
import { CandidateAnonymizer } from './CandidateAnonymizer';
import { AppError } from '../Common/AppError';
import { IRecruiteeClient } from '../Recruitee/IRecruiteeClient';
import { ISlackClient, RecruiteeOutcome } from '../Slack/ISlackClient';
import { IEmailClient } from '../Email/IEmailClient';
import { AxiosResponse } from 'axios';
import { OfferResolver } from '../Recruitee/OfferResolver';
import { suggestOffers } from '../Recruitee/OfferSuggester';
import { createCandidateWithFiles } from '../Recruitee/createCandidateWithFiles';
import { RecruiteeOffer } from '../Recruitee/RecruiteeOffer';

export interface CandidateProcessorOptions {
  // Recruitee offer (ideally a talent pool) for candidates that cannot be matched to any offer
  fallbackOfferId?: number;
  // Whether a reconciler is running that will pick up candidates this processor failed to create
  reconcilerImports?: boolean;
}

/**
 * Takes normalized StartupJobs payload, creates the candidate in Recruitee and announces them on Slack
 * in one message that also says where in Recruitee they ended up.
 */
export class CandidateProcessor {
  private slack?: ISlackClient;
  private recruitee?: IRecruiteeClient;
  private email?: IEmailClient;
  private resolver?: OfferResolver;
  private options: CandidateProcessorOptions;

  constructor(slack?: ISlackClient, recruitee?: IRecruiteeClient, email?: IEmailClient, options: CandidateProcessorOptions = {}) {
    this.slack = slack;
    this.recruitee = recruitee;
    this.email = email;
    this.options = options;
    if (!this.recruitee && !this.slack && !this.email) {
      throw new Error('Neither Slack, Recruitee, or Email are enabled. Aborting');
    }
    if (this.recruitee) {
      this.resolver = new OfferResolver(this.recruitee, options.fallbackOfferId);
    }
  }

  public async process(payload: StartupJobsPayload, params?: Object) {
    const tags: string[] = Object.values(params ?? {})
      .flat()
      .filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '');

    // Recruitee first, so the Slack message can say where the candidate ended up.
    // Whatever happens there, Slack still hears about the candidate.
    let recruiteeResponse: AxiosResponse<any> | undefined;
    let outcome: RecruiteeOutcome | undefined;
    let failure: unknown;
    if (this.recruitee && this.resolver) {
      try {
        const result = await this.sendToRecruitee(payload, tags);
        recruiteeResponse = result.response;
        outcome = result.outcome;
      } catch (e) {
        failure = e;
        outcome = {
          status: 'failed',
          // Only our own messages are safe to show; anything else may carry request details
          reason: e instanceof AppError ? e.message : 'chyba při zápisu do Recruitee',
          willRetry: !!this.options.reconcilerImports,
          suggestions: e instanceof UnmatchedError ? e.suggestions : undefined,
        };
      }
    }

    if (this.slack) {
      const shown = payload.gdpr_accepted ? payload : new CandidateAnonymizer().anonymize(payload);
      try {
        await this.slack.sendCandidateToSlack(shown, outcome);
      } catch (e) {
        // A Slack outage must not cost the candidate their confirmation e-mail
        failure = failure ?? e;
      }
    }

    if (this.email && recruiteeResponse) {
      await this.email.sendCandidateEmail(payload, recruiteeResponse);
    }
    if (failure) {
      throw failure;
    }
  }

  private async sendToRecruitee(
    payload: StartupJobsPayload,
    tags: string[]
  ): Promise<{ response: AxiosResponse<any>; outcome: RecruiteeOutcome }> {
    const recruitee = this.recruitee as IRecruiteeClient;
    const offers: RecruiteeOffer[] = await recruitee.getOffers();
    const resolution = await (this.resolver as OfferResolver).resolve(payload, offers);
    if (!resolution) {
      throw new UnmatchedError(
        `Unable to match ${payload.position} (${payload.internalPositionName}) to any Recruitee offer`,
        suggestOffers([payload.position, payload.internalPositionName], offers)
      );
    }
    const response = await createCandidateWithFiles(recruitee, resolution.offerId, payload);
    const candidate = response?.data?.candidate;
    if (candidate?.id && tags.length > 0) {
      try {
        await recruitee.addCandidateTags(candidate.id, tags);
      } catch (e) {
        // The candidate is in; a missing tag is not worth reporting them as failed
        console.log(`Tagging candidate ${candidate.id} failed: ${(e as Error).message}`);
      }
    }
    const fallback = resolution.via === 'fallback';
    return {
      response,
      outcome: {
        status: fallback ? 'fallback' : 'placed',
        offerTitle: resolution.title,
        candidateUrl: candidate?.adminapp_url,
        suggestions: fallback ? suggestOffers([payload.position, payload.internalPositionName], offers) : undefined,
      },
    };
  }
}

class UnmatchedError extends AppError {
  constructor(message: string, public readonly suggestions: { id: number; title: string }[]) {
    super(500, message);
  }
}
