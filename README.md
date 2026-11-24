# StartupJobsBot

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Takes applications from [StartupJobs](https://www.startupjobs.cz), announces them on Slack, creates the candidate in
Recruitee and sends the candidate a confirmation e-mail. See [app.json](./app.json) for all environment variables.

## How an application gets to Recruitee

1. **Webhook.** Every StartupJobs offer has the bot's `/webhook` URL set. Query parameters become Recruitee tags
   (`/webhook?tag=backend`).
2. **Matching.** The offer's *internal position name* and then its title are compared, case-insensitively, with each
   active (published or internal) Recruitee offer: its id, title, slug and tags. The match must be exact.
3. **Explicit id.** If the internal position name is a number, it is taken as a Recruitee offer id even when that
   offer is not in the active list, for example a talent pool. Closed and archived offers are refused.
   **This is the mapping that survives renaming on either side, so prefer it.**
4. **Fallback.** If nothing matches, the candidate goes to the offer in `RECRUITEE_FALLBACK_OFFER_ID` (create a
   dedicated talent pool for it) and Slack gets a notice saying which StartupJobs offer needs its internal name fixed.
   Without the variable such candidates do not reach Recruitee.

Slack gets one message per candidate. It ends with where the candidate landed in Recruitee and a link to the profile,
or with why they did not get there. Only the first attached file can be the CV; the others are attached to the
profile as files and also kept as links, in case Recruitee cannot download them.

The webhook always answers 200, because StartupJobs deletes a webhook that answers with an error.

## Reconciler

The webhook is fire-once: an offer without the URL, a webhook deleted by StartupJobs or the bot being down all lose
applications silently. With `STARTUPJOBS_API_TOKEN` set, the bot therefore pulls applications from the StartupJobs API
every `RECONCILE_INTERVAL_MINUTES` and imports those from the last `RECONCILE_LOOKBACK_DAYS` that are missing in
Recruitee, using the same matching and fallback as the webhook.

- It starts in **dry run** (`RECONCILE_DRY_RUN=true`): it only posts to Slack what it would import. Switch it to
  `false` once a report looks right.
- A person is looked up in Recruitee by e-mail. When the bot cannot tell whether an application is already there, it
  does not import it; a person known only from an older application is listed for review instead.
- Imported candidates get a note at the top of the cover letter and no confirmation e-mail.
- Slack summaries contain positions and ids only, no names or contact details.

## Scheduled reports

All go to the Slack channel of `SLACK_WEBHOOK_URL` and contain no names or contact details. Times are in `BOT_TIMEZONE`.

- **Daily check** (`DAILY_CHECK_HOUR`, default 8): lists active StartupJobs offers that would not find a Recruitee
  offer, with the closest Recruitee offers and their ids, and says how many candidates have waited in the fallback pool
  for more than `FALLBACK_REMINDER_WORKDAYS` working days. Silent when there is nothing to fix.
- **Monday summary** (`WEEKLY_SUMMARY_HOUR`, default 9): last week's applications per position and whether each is in
  Recruitee, the size of the fallback pool, and the offers that are matched by text instead of by id.

The bot keeps no state. If Heroku restarts it inside the hour of a report, that report can be posted twice.

### Backfill

    yarn reconcile --since 2026-01-01            # dry run: prints who is missing
    yarn reconcile --since 2026-01-01 --apply    # imports them

`yarn offers` lists the active Recruitee offers with ids and tags.

## Development

    yarn test
    yarn dev
