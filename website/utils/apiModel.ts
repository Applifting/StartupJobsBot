export interface HealthCheckResult {
  status: AppStatus;
  slack?: SlackIntegrationCheckResult;
  recruitee?: RecruiteeIntegrationCheckResult;
}

export enum RecruiteeIntegrationCheckResult {
  OK = "OK",
  BAD_ACCESS_TOKEN = "BAD_ACCESS_TOKEN",
  BAD_COMPANY_DOMAIN = "BAD_COMPANY_DOMAIN",
  RECRUITEE_NOT_AVAILABLE = "RECRUITEE_NOT_AVAILABLE",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  NOT_SET_UP = "NOT_SET_UP"
}

export enum SlackIntegrationCheckResult {
  OK = "OK",
  INVALID_SLACK_URL = "INVALID_SLACK_URL",
  FORBIDDEN = "FORBIDDEN",
  SLACK_NOT_AVAILABLE = "SLACK_NOT_AVAILABLE",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  NOT_SET_UP = "NOT_SET_UP"
}

export enum AppStatus {
  UP = "UP",
  DOWN = "DOWN"
}
