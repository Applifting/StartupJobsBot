/** A candidate found in Recruitee by search. Optional fields depend on what the search endpoint returns. */
export interface RecruiteeCandidateHit {
  id: number;
  emails?: string[];
  createdAt?: string;
  // ids of offers (jobs and talent pools) the candidate is placed in
  offerIds: number[];
}

export interface RecruiteeCandidateList {
  // Number of candidates matching the query, which may be more than the hits returned
  total: number;
  hits: RecruiteeCandidateHit[];
}
