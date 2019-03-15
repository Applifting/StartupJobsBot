import { Server } from "./Server/Server";
import { StartupJobsWebhookParser } from "./StartupJobs/StartupJobsWebhookParser";
import { CandiateProcessor } from "./Candidate/CandidateProcessor";
import { SlackClient } from "./Slack/SlackClient";
import { RecruiteeClient } from "./Recruitee/RecruiteeClient";
import { getConfig } from "./config";

const config = getConfig();
const parser = new StartupJobsWebhookParser();

const processor = new CandiateProcessor(
  config.slack && new SlackClient(config.slack),
  config.recruitee && new RecruiteeClient(config.recruitee)
);
const server = new Server(parser, processor, config.server);

server.start();
