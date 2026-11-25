/**
 * The subset of candidate data needed to create a candidate in Recruitee and to match them to an offer.
 * Both the StartupJobs webhook payload and applications pulled from the StartupJobs API satisfy it.
 */
export interface CandidateData {
  name: string;
  position: string;
  // Other names of the same position, e.g. the title in another language
  positionAliases?: string[];
  internalPositionName?: string | null;
  email?: string | null;
  phone?: string | null;
  why?: string | null;
  details?: string | null;
  linkedin?: string | null;
  files?: string[] | null;
  source?: string;
}
