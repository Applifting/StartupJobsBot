import Koa from "koa";
import { ServerConfig } from "./ServerConfig";
import { StartupJobsWebhookParser } from "../StartupJobs/StartupJobsWebhookParser";
import { inspect } from "util";
import { CandiateProcessor } from "../Candidate/CandidateProcessor";
import { Server as HttpServer } from "http";
import { IErrorReporter } from "../Common/IErrorReporter";
import { HealthCheck } from "../Healthcheck/Healthcheck";
import { AppStatus } from "../Healthcheck/HealthCheckResult";
const bodyParser = require("koa-bodyparser");
const cors = require("@koa/cors");

export class Server {
  private server: Koa;
  private config: ServerConfig;
  private parser: StartupJobsWebhookParser;
  private processor: CandiateProcessor;
  private runningServer?: HttpServer;
  private errorReporter: IErrorReporter | undefined;
  private healthCheck: HealthCheck;

  constructor(
    parser: StartupJobsWebhookParser,
    processor: CandiateProcessor,
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
    this.server.use(cors());
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
          console.log(err);
        }
        if (this.errorReporter) {
          this.errorReporter
            .reportError(inspect((<any>ctx.request).body), err)
            .catch(e => {
              console.log(e);
            });
        }
        ctx.status = err.statusCode || err.status || 500;
        ctx.body = {
          message: err.message
        };
      }
    });
    // Webhook
    this.server.use(async (ctx, next) => {
      const endpoint = this.config.webhookPath.startsWith("/")
        ? this.config.webhookPath
        : `/${this.config.webhookPath}`;
      if (endpoint === ctx.path && ctx.method === "POST") {
        const payload = this.parser.parse((<any>ctx.request).body);
        await this.processor.process(payload);
        ctx.status = 200;
      }
      await next();
    });
    // Health check
    this.server.use(async (ctx, next) => {
      if (ctx.path === "/health" && ctx.method === "GET") {
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

  public start() {
    if (!this.runningServer) {
      this.runningServer = this.server.listen(this.config.port);
      console.log(
        `✅  StartupJobsBot started at port ${this.config.port} and webhook path ${this.config.webhookPath}`
      );
    } else {
      console.error("Server is already running!");
    }
  }

  public async stop() {
    return new Promise((res, rej) => {
      if (this.runningServer) {
        this.runningServer.close(() => {
          res();
          console.log("Server stopped");
          return;
        });
      }
    });
  }
}
