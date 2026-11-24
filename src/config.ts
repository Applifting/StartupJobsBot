import { ServerConfig } from './Server/ServerConfig';
import { SlackConfig } from './Slack/SlackConfig';
import { RecruiteeConfig } from './Recruitee/RecruiteeConfig';
import { GmailConfig } from './Email/GmailClient';
import { StartupJobsApiConfig } from './StartupJobs/StartupJobsApiClient';
import { ReconcilerOptions } from './Reconciler/Reconciler';
import * as dotenv from 'dotenv';

dotenv.config();

export interface Config {
  server: ServerConfig;
  slack?: SlackConfig;
  recruitee?: RecruiteeConfig;
  gmail?: GmailConfig;
  startupJobsApi?: StartupJobsApiConfig;
  reconciler: ReconcilerOptions & { intervalMinutes: number };
  reports: ReportsConfig;
}

export interface ReportsConfig {
  timeZone: string;
  // Local hour of the daily offer check and fallback pool reminder; -1 turns them off
  dailyCheckHour: number;
  // Local hour of the Monday summary; -1 turns it off
  weeklySummaryHour: number;
  // Working days a candidate may sit in the fallback pool before the reminder mentions them
  fallbackReminderWorkdays: number;
}

const hour = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed >= -1 && parsed <= 23 ? parsed : fallback;
};

const positiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const getConfig = (): Config => {
  const isTestEnvironment = process.env.NODE_ENV === 'test';
  
  let recruiteeConfig = undefined;
  let recruiteeAccessToken = process.env.RECRUITEE_ACCESS_TOKEN;
  let recruiteeDomain = process.env.RECRUITEE_DOMAIN;
  if (recruiteeAccessToken && recruiteeDomain) {
    recruiteeConfig = {
      accessToken: recruiteeAccessToken,
      companyDomain: recruiteeDomain,
      fallbackOfferId: positiveInt(process.env.RECRUITEE_FALLBACK_OFFER_ID, 0) || undefined,
    };
  }

  let slackConfig = undefined;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackWebhookUrl) {
    slackConfig = {
      webhookUrl: slackWebhookUrl,
      messageTitle: isTestEnvironment 
        ? `[TEST] ${process.env.SLACK_MESSAGE_TITLE || 'Nový kandidát!'}`
        : process.env.SLACK_MESSAGE_TITLE,
      reportErrors: process.env.SLACK_REPORT_ERRORS === 'true' || false,
    };
  }

  let gmailConfig: GmailConfig | undefined;
  const gmailEmail = process.env.GMAIL_EMAIL;
  const gmailPassword = process.env.GMAIL_PASSWORD;
  if (gmailEmail && gmailPassword) {
    gmailConfig = {
      email: gmailEmail,
      password: gmailPassword,
      subjectTemplate: isTestEnvironment 
        ? `[TEST] ${process.env.GMAIL_SUBJECT_TEMPLATE || 'Your application landed safely! 🚀'}`
        : process.env.GMAIL_SUBJECT_TEMPLATE,
      bodyTemplate: process.env.GMAIL_BODY_TEMPLATE,
    };
  }

  return {
    server: {
      port: Number.parseInt(process.env.PORT || '3000'),
      logErrors: true,
      logPayloads: process.env.LOG_PAYLOADS === 'true' || false,
      logRequests: process.env.LOG_REQUESTS === 'true' || true,
      webhookPath: process.env.WEBHOOK_PATH || '/webhook',
    },
    recruitee: recruiteeConfig,
    slack: slackConfig,
    gmail: gmailConfig,
    startupJobsApi: process.env.STARTUPJOBS_API_TOKEN
      ? { apiToken: process.env.STARTUPJOBS_API_TOKEN, baseUrl: process.env.STARTUPJOBS_API_URL || undefined }
      : undefined,
    reconciler: {
      intervalMinutes: positiveInt(process.env.RECONCILE_INTERVAL_MINUTES, 60),
      lookbackDays: positiveInt(process.env.RECONCILE_LOOKBACK_DAYS, 14),
      // Dry run unless explicitly switched off, so a fresh deploy never writes before somebody has read a report
      dryRun: process.env.RECONCILE_DRY_RUN !== 'false',
      graceMinutes: positiveInt(process.env.RECONCILE_GRACE_MINUTES, 15),
      maxImportsPerRun: positiveInt(process.env.RECONCILE_MAX_IMPORTS_PER_RUN, 25),
      tag: process.env.RECONCILE_TAG || undefined,
    },
    reports: {
      timeZone: process.env.BOT_TIMEZONE || 'Europe/Prague',
      dailyCheckHour: hour(process.env.DAILY_CHECK_HOUR, 8),
      weeklySummaryHour: hour(process.env.WEEKLY_SUMMARY_HOUR, 9),
      fallbackReminderWorkdays: positiveInt(process.env.FALLBACK_REMINDER_WORKDAYS, 2),
    },
  };
};
