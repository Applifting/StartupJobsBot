import { Server } from './Server/Server';
import { StartupJobsWebhookParser } from './StartupJobs/StartupJobsWebhookParser';
import { CandiateProcessor } from './Candidate/CandidateProcessor';
import { SlackClient } from './Slack/SlackClient';
import { RecruiteeClient } from './Recruitee/RecruiteeClient';
import { GmailClient } from './Email/GmailClient';
import { getConfig } from './config';
import { IErrorReporter } from './Common/IErrorReporter';
import { HealthCheck } from './HealthCheck/HealthCheck';

const config = getConfig();
const parser = new StartupJobsWebhookParser();
const slack = config.slack && new SlackClient(config.slack);
const recruitee = config.recruitee && new RecruiteeClient(config.recruitee);
const email = config.gmail && new GmailClient(config.gmail);
const processor = new CandiateProcessor(slack, recruitee, email);
const healthCheck = new HealthCheck(slack, recruitee);

let errorReporter: IErrorReporter | undefined;
if (config.slack && config.slack.reportErrors) {
  errorReporter = slack;
}

const server = new Server(parser, processor, healthCheck, errorReporter, config.server);
console.log('⏳  StartupJobsBot is starting...');
if (recruitee) {
  console.log(`✅  Recruitee is enabled for company domain ${config.recruitee?.companyDomain}`);
} else {
  console.log('➖  Recruitee integration is not set up');
}
if (slack) {
  console.log(`✅  Slack is enabled`);
} else {
  console.log('➖  Slack integration is not set up');
}

server.start();
