import { IRecruiteeClient } from '../Recruitee/IRecruiteeClient';
import { workingDaysSince } from './schedule';

export interface FallbackPoolState {
  // Candidates who are in the fallback offer and nowhere else
  unsorted: number;
  // Of those, how many have been waiting at least the configured number of working days
  overdue: number;
  oldestSince?: string;
  url?: string;
}

/** Watches the fallback offer so that nobody is forgotten there. Works with counts and dates only. */
export class FallbackPoolReminder {
  constructor(
    private recruitee: IRecruiteeClient,
    private fallbackOfferId: number,
    private workdays: number,
    private timeZone: string
  ) {}

  public async check(now: Date = new Date()): Promise<FallbackPoolState> {
    const offer = await this.recruitee.getOfferById(this.fallbackOfferId);
    const list = await this.recruitee.listCandidatesInOffer(this.fallbackOfferId, offer?.kind === 'job' ? 'job' : 'talent_pool');
    // Somebody already added to a real job no longer waits, even if they were left in the pool
    const unsorted = list.hits.filter((hit) => hit.offerIds.every((id) => id === this.fallbackOfferId));
    const overdue = unsorted.filter(
      (hit) => hit.createdAt && workingDaysSince(new Date(hit.createdAt), now, this.timeZone) >= this.workdays
    );
    const oldest = overdue.map((hit) => hit.createdAt as string).sort()[0];
    return { unsorted: unsorted.length, overdue: overdue.length, oldestSince: oldest?.slice(0, 10), url: offer?.adminUrl };
  }

  public format(state: FallbackPoolState): string | undefined {
    if (state.overdue === 0) {
      return undefined;
    }
    const pool = state.url ? `<${state.url}|záložním talent poolu>` : 'záložním talent poolu';
    return (
      `:hourglass_flowing_sand: V ${pool} čekají kandidáti déle než ${this.workdays} pracovní dny: ${state.overdue} ` +
      `(nejdéle od ${state.oldestSince}). Nezařazených celkem: ${state.unsorted}.`
    );
  }
}
