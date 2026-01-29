export interface RecruiteeOffer {
  id: number;
  offer_tags?: string[];
  slug: string;
  title: string;
  status?: 'published' | 'internal' | 'closed' | 'archived';
}
