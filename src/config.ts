import { ServerConfig } from "./Server/ServerConfig";
import { SlackConfig } from "./Slack/SlackConfig";
import { RecruiteeConfig } from "./Recruitee/RecruiteeConfig";

export interface Config {
  server: ServerConfig;
  slack?: SlackConfig;
  recruitee?: RecruiteeConfig;
}

export const getConfig = (): Config => {
  let recruiteeConfig = undefined;
  let recruiteeAccessToken = process.env.RECRUITEE_ACCESS_TOKEN;
  let recruiteeDomain = process.env.RECRUITEE_DOMAIN;
  if (recruiteeAccessToken && recruiteeDomain) {
    recruiteeConfig = {
      accessToken: recruiteeAccessToken,
      companyDomain: recruiteeDomain
    };
  }

  let slackConfig = undefined;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackWebhookUrl) {
    slackConfig = {
      webhookUrl: slackWebhookUrl,
      messageTitle: process.env.SLACK_MESSAGE_TITLE
    };
  }
  return {
    server: {
      port: Number.parseInt(process.env.PORT || "3000"),
      logErrors: true,
      logPayloads: process.env.LOG_PAYLOADS === "true" || false,
      logRequests: process.env.LOG_REQUESTS === "true" || true,
      webhookPath: process.env.WEBHOOK_PATH || "/webhook"
    },
    recruitee: recruiteeConfig,
    slack: slackConfig
  };
};
