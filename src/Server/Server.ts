import Koa from 'koa';
import { ServerConfig } from './ServerConfig';
import { StartupJobsWebhookParser } from '../StartupJobs/StartupJobsWebhookParser';
import { inspect } from 'node:util';
import { CandidateProcessor } from '../Candidate/CandidateProcessor';
import * as http from 'http';
import { IErrorReporter } from '../Common/IErrorReporter';
import { HealthCheck } from '../HealthCheck/HealthCheck';
import { AppStatus } from '../HealthCheck/HealthCheckResult';
import { describePayload } from '../Common/describePayload';
import { sanitzeError } from '../Common/sanitizeError';
import { summarizeError } from '../Common/summarizeError';
const bodyParser = require('koa-bodyparser');

export class Server {
  private server: Koa;
  private config: ServerConfig;
  private parser: StartupJobsWebhookParser;
  private processor: CandidateProcessor;
  private runningServer?: http.Server;
  private errorReporter: IErrorReporter | undefined;
  private healthCheck: HealthCheck;
  private inFlight: Promise<void>[] = [];

  constructor(
    parser: StartupJobsWebhookParser,
    processor: CandidateProcessor,
    healthCheck: HealthCheck,
    errorReporter: IErrorReporter | undefined,
    config: ServerConfig
  ) {
    this.config = config;
    this.parser = parser;
    this.processor = processor;
    this.server = new Koa();
    this.healthCheck = healthCheck;
    this.errorReporter = errorReporter;
    this.server.use(bodyParser());
    // Logger
    this.server.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      if (this.config.logPayloads) {
        console.log(`Payload:\n${inspect((<any>ctx.request).body)}`);
      }
      if (this.config.logRequests) {
        console.log(`${ctx.method} ${ctx.url} (${ctx.status}) [${ms}ms]`);
      }
    });
    // Error handler
    this.server.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        if (this.config.logErrors) {
          console.log(sanitzeError(summarizeError(err)));
        }
        if (this.errorReporter) {
          this.errorReporter.reportError(describePayload((<any>ctx.request).body), err).catch((e) => {
            console.log(e);
          });
        }
        ctx.status = err.statusCode || err.status || 500;
        ctx.body = {
          message: err.message,
        };
      }
    });
    // Webhook
    this.server.use(async (ctx, next) => {
      const endpoint = this.config.webhookPath.startsWith('/') ? this.config.webhookPath : `/${this.config.webhookPath}`;
      if (endpoint === ctx.path && ctx.method === 'POST') {
        const body = (<any>ctx.request).body;
        const reportWebhookError = (err: any) => {
          if (this.config.logErrors) {
            console.log('Webhook error:', sanitzeError(summarizeError(err)));
          }
          if (this.errorReporter) {
            this.errorReporter.reportError(describePayload(body), err).catch((e) => {
              console.log('Error reporting failed:', e);
            });
          }
        };
        try {
          const payload = this.parser.parse(body);
          if (payload.test === true) {
            console.log('Received test webhook, validated but not processing');
          } else {
            // Processing talks to Recruitee, Slack and Gmail and can take a while. StartupJobs deletes a webhook
            // that does not answer, so answer now and finish in the background. Errors are reported the same way.
            this.inFlight.push(this.processor.process(payload, ctx.query).catch(reportWebhookError));
          }
        } catch (err) {
          reportWebhookError(err);
        }
        // Always return 200, even on error, to prevent webhook deletion
        ctx.status = 200;
        ctx.body = ctx.body || { message: 'OK' };
      }
      await next();
    });
    // Health check
    this.server.use(async (ctx, next) => {
      if (ctx.path === '/health' && ctx.method === 'GET') {
        const checkResult = await healthCheck.checkHealth();
        ctx.body = checkResult;
        if (checkResult.status == AppStatus.UP) {
          ctx.status = 200;
        } else {
          ctx.status = 503;
        }
      }
      await next();
    });
  }

  /** Resolves when every webhook received so far has been processed. */
  public async idle(): Promise<void> {
    while (this.inFlight.length > 0) {
      await this.inFlight.shift();
    }
  }

  public start() {
    if (!this.runningServer) {
      this.runningServer = this.server.listen(this.config.port);
      console.log(`✅  StartupJobsBot started at port ${this.config.port} and webhook path ${this.config.webhookPath}`);
    } else {
      console.error('Server is already running!');
    }
  }

  public async stop(): Promise<void> {
    return new Promise<void>((res) => {
      if (this.runningServer) {
        this.runningServer.close(() => {
          res(undefined);
          console.log('Server stopped');
          return;
        });
      }
    });
  }
}
