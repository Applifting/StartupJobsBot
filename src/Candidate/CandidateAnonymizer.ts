import { StartupJobsPayload } from '../StartupJobs/webhookPayload';

/**
 * Anononimizes the candidate for the purposes of GDPR
 */
export class CandidateAnonymizer {
  public anonymize(candidate: StartupJobsPayload): StartupJobsPayload {
    return {
      ...candidate,
      email: CandidateAnonymizer.AnonymizeProperty(candidate.email, candidate),
      phone: CandidateAnonymizer.AnonymizeProperty(candidate.phone, candidate),
      name: CandidateAnonymizer.AnonymizeProperty(candidate.name, candidate),
      why: CandidateAnonymizer.AnonymizeProperty(candidate.why, candidate),
    };
  }

  private static AnonymizeProperty(property: string, candidate: StartupJobsPayload): string {
    let anonimized = property;
    if (candidate.email) {
      anonimized = anonimized.replace(candidate.email, '<<anonymized email>>');
    }
    if (candidate.phone) {
      anonimized = anonimized.replace(candidate.phone, '<<anonymized phone>>');
    }
    if (candidate.name) {
      anonimized = anonimized.replace(candidate.name, '<<anonymized name>>');
    }
    return anonimized;
  }
}
