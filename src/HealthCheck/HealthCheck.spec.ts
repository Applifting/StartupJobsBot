import { HealthCheck } from "./Healthcheck";
import { MockSlackClient } from "../TestUtils/MockSlackClient";
import { SlackIntegrationCheckResult } from "../Slack/SlackIntegrationCheckResult";
import { MockRecruiteeClient } from "../TestUtils/MockRecruiteeClient";
import { RecruiteeClient } from "../Recruitee/RecruiteeClient";
import { RecruiteeIntegrationCheckResult } from "../Recruitee/RecruiteeIntegrationCheckResult";

describe("HealthCheck", () => {
  it("Returns UP if everything is running", async () => {
    const check = new HealthCheck(
      new MockSlackClient(),
      new MockRecruiteeClient([])
    );
    const result = await check.checkHealth();
    expect(result.status).toEqual("UP");
    expect(result.slack).toEqual(SlackIntegrationCheckResult.OK);
  });

  it("Returns DOWN if SLACK is not running", async () => {
    const check = new HealthCheck(
      new MockSlackClient({
        integrationCheckResult: SlackIntegrationCheckResult.SLACK_NOT_AVAILABLE
      })
    );
    const result = await check.checkHealth();
    expect(result.status).toEqual("DOWN");
    expect(result.slack).toEqual(
      SlackIntegrationCheckResult.SLACK_NOT_AVAILABLE
    );
  });

  it("Returns DOWN if Recruitee is not running", async () => {
    const check = new HealthCheck(
      undefined,
      new MockRecruiteeClient([], {
        integrationCheckResult:
          RecruiteeIntegrationCheckResult.BAD_COMPANY_DOMAIN
      })
    );
    const result = await check.checkHealth();
    expect(result.status).toEqual("DOWN");
    expect(result.recruitee).toEqual(
      RecruiteeIntegrationCheckResult.BAD_COMPANY_DOMAIN
    );
  });
});
