import { AxiosResponse } from 'axios';
import { CandidateData } from '../Candidate/CandidateData';
import { IRecruiteeClient } from './IRecruiteeClient';

/**
 * Creates the candidate and then attaches every file after the first one, which Recruitee takes as the CV.
 * A failed attachment never fails the candidate: the extra files are also saved as links on the profile.
 */
export const createCandidateWithFiles = async (
  recruitee: IRecruiteeClient,
  offerId: number,
  candidate: CandidateData
): Promise<AxiosResponse<any>> => {
  const response = await recruitee.createCandidateInRecruitee(offerId, candidate);
  const candidateId: number | undefined = response?.data?.candidate?.id;
  const extraFiles = (candidate.files || []).slice(1).filter((f) => f.startsWith('http'));
  if (candidateId) {
    for (const file of extraFiles) {
      try {
        await recruitee.attachRemoteFile(candidateId, file);
      } catch (e) {
        // No URL in the log, it can carry an access hash
        console.log(`Attaching an extra file to candidate ${candidateId} failed: ${(e as Error).message}`);
      }
    }
  }
  return response;
};
