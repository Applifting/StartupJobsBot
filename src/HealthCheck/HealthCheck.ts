import { ISlackClient } from "../Slack/ISlackClient";
import { HealthCheckResult, AppStatus } from "./HealthCheckResult";
import { SlackIntegrationCheckResult } from "../Slack/SlackIntegrationCheckResult";
import { IRecruiteeClient } from "../Recruitee/IRecruiteeClient";
import { RecruiteeIntegrationCheckResult } from "../Recruitee/RecruiteeIntegrationCheckResult";

export class HealthCheck {
  slack: ISlackClient | undefined;
  recruitee: IRecruiteeClient | undefined;

  constructor(slack?: ISlackClient, recruitee?: IRecruiteeClient) {
    this.slack = slack;
    this.recruitee = recruitee;
  }

  public async checkHealth(): Promise<HealthCheckResult> {
    const promises: Promise<any>[] = [];
    const slack = this.slack?.checkIntegration();
    const recruitee = this.recruitee?.checkIntegration();
    if (slack) {
      promises.push(slack);
    }
    if (recruitee) {
      promises.push(recruitee);
    }

    await Promise.all(promises);

    //Unwrap resolved
    const slackResult = (await slack) ?? undefined;
    const recruiteeResult = (await recruitee) ?? undefined;
    let appStatus = AppStatus.UP;
    if (slackResult && slackResult != SlackIntegrationCheckResult.OK) {
      appStatus = AppStatus.DOWN;
    }
    if (
      recruiteeResult &&
      recruiteeResult != RecruiteeIntegrationCheckResult.OK
    ) {
      appStatus = AppStatus.DOWN;
    }
    return {
      status: appStatus,
      slack: slackResult ?? SlackIntegrationCheckResult.NOT_SET_UP,
      recruitee: recruiteeResult ?? RecruiteeIntegrationCheckResult.NOT_SET_UP
    };
  }
}
