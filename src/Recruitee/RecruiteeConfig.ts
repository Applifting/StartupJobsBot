export interface RecruiteeConfig {
  accessToken: string;
  companyDomain: string;
  // Offer (ideally a talent pool) that receives candidates who cannot be matched to any offer
  fallbackOfferId?: number;
}
