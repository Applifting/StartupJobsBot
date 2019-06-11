import { Server } from "./Server";
import { StartupJobsWebhookParser } from "../StartupJobs/StartupJobsWebhookParser";
import { CandiateProcessor } from "../Candidate/CandidateProcessor";
import { MockSlackClient } from "../TestUtils/MockSlackClient";
import { MockRecruiteeClient } from "../TestUtils/MockRecruiteeClient";
import { webhookDevOffer } from "../TestUtils/offers";
import axios from "axios";
import { mrShark } from "../TestUtils/candidates";
import { SlackClient } from "../Slack/SlackClient";
import { RecruiteeClient } from "../Recruitee/RecruiteeClient";
import { IErrorReporter } from "../Common/IErrorReporter";

class InMemoryErrorReporter implements IErrorReporter {
  lastError: Error | undefined;

  async reportError(payload: string, error: Error): Promise<void> {
    this.lastError = error;
  }
}

describe("Server", () => {
  let server: Server;
  let slack: MockSlackClient;
  let recruitee: MockRecruiteeClient;
  let inMemoryReporter: InMemoryErrorReporter;

  beforeEach(async () => {
    inMemoryReporter = new InMemoryErrorReporter();
    slack = new MockSlackClient();
    recruitee = new MockRecruiteeClient([webhookDevOffer]);
    const processor = new CandiateProcessor(slack, recruitee);
    server = new Server(
      new StartupJobsWebhookParser(),
      processor,
      inMemoryReporter,
      {
        port: 4000,
        logPayloads: false,
        logErrors: false,
        logRequests: false,
        webhookPath: "/testWebhook"
      }
    );
    server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe("valid requests", () => {
    it("processes valid webhook request", async () => {
      const response = await axios.post(
        "http://localhost:4000/testWebhook",
        mrShark
      );
      expect(response.status).toBe(200);
      expect(slack.sendCandidateToSlackCalled).toBe(true);
      expect(recruitee.createCandidateCalled).toBe(true);
    });
  });

  describe("invalid requests", () => {
    it("fails 400 when invalid request is sent", async () => {
      try {
        const response = await axios.post("http://localhost:4000/testWebhook", {
          ...mrShark,
          name: undefined
        });
        fail();
      } catch (e) {
        expect(inMemoryReporter.lastError).toBeDefined();
        expect(e.response.status).toBe(400);
      }
    });
  });
});
