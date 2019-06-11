import { Server } from "./Server/Server";
import { StartupJobsWebhookParser } from "./StartupJobs/StartupJobsWebhookParser";
import { CandiateProcessor } from "./Candidate/CandidateProcessor";
import { SlackClient } from "./Slack/SlackClient";
import { RecruiteeClient } from "./Recruitee/RecruiteeClient";
import { getConfig } from "./config";
import { IErrorReporter } from "./Common/IErrorReporter";

const config = getConfig();
const parser = new StartupJobsWebhookParser();
const slack = config.slack && new SlackClient(config.slack);
const processor = new CandiateProcessor(
  slack,
  config.recruitee && new RecruiteeClient(config.recruitee)
);

let errorReporter: IErrorReporter | undefined;
if (config.slack && config.slack.reportErrors) {
  errorReporter = slack;
}

const server = new Server(parser, processor, errorReporter, config.server);

server.start();
