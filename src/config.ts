import { ServerConfig } from './Server/ServerConfig';
import { SlackConfig } from './Slack/SlackConfig';
import { RecruiteeConfig } from './Recruitee/RecruiteeConfig';
import { GmailConfig } from './Email/GmailClient';
import * as dotenv from 'dotenv';

dotenv.config();

export interface Config {
  server: ServerConfig;
  slack?: SlackConfig;
  recruitee?: RecruiteeConfig;
  gmail?: GmailConfig;
}

export const getConfig = (): Config => {
  const isTestEnvironment = process.env.NODE_ENV === 'test';
  
  let recruiteeConfig = undefined;
  let recruiteeAccessToken = process.env.RECRUITEE_ACCESS_TOKEN;
  let recruiteeDomain = process.env.RECRUITEE_DOMAIN;
  if (recruiteeAccessToken && recruiteeDomain) {
    recruiteeConfig = {
      accessToken: recruiteeAccessToken,
      companyDomain: recruiteeDomain,
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
  };
};
