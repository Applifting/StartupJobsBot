import { SlackIntegrationCheckResult } from "../Slack/SlackIntegrationCheckResult";
import { RecruiteeIntegrationCheckResult } from "../Recruitee/RecruiteeIntegrationCheckResult";

export interface HealthCheckResult {
  status: AppStatus;
  slack?: SlackIntegrationCheckResult;
  recruitee?: RecruiteeIntegrationCheckResult;
}

export enum AppStatus {
  UP = "UP",
  DOWN = "DOWN"
}
