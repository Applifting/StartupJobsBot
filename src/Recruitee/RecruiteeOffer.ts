export interface RecruiteeOffer {
  id: number;
  offer_tags?: string[];
  slug: string;
  title: string;
  // 'published' | 'internal' | 'closed' | 'archived' | 'draft' for jobs; kept open because talent pools may report other values
  status?: string;
  // 'job' | 'talent_pool'
  kind?: string;
  // Link to the offer in the Recruitee web app, present on offers fetched by id
  adminUrl?: string;
}

export const ACTIVE_OFFER_STATUSES = ['published', 'internal'];
export const DEAD_OFFER_STATUSES = ['closed', 'archived'];
