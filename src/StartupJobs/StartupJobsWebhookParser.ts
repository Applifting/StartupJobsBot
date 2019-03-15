import { StartupJobsPayload, startupJobsPayloadSchema } from "./webhookPayload";
import { AppError } from "../Common/AppError";
import { inspect } from "util";
import Joi from "joi";

export class StartupJobsWebhookParser {
  public parse(webhookPayload: any): StartupJobsPayload {
    // Validate input using schema
    const validationResult = Joi.validate<StartupJobsPayload>(
      webhookPayload,
      startupJobsPayloadSchema,
      { stripUnknown: true, abortEarly: true }
    );
    if (validationResult.error) {
      throw new AppError(
        400,
        `ParsingError: ${validationResult.error.message}`
      );
    }
    return StartupJobsWebhookParser.normalizePayload(validationResult.value);
  }

  private static normalizePayload(
    webhookPayload: StartupJobsPayload
  ): StartupJobsPayload {
    const normalized = { ...webhookPayload };
    normalized.linkedin =
      webhookPayload.linkedin && webhookPayload.linkedin.replace(/\\/g, "");
    normalized.files =
      normalized.files && normalized.files.map(f => f.replace(/\\/g, ""));
    return normalized;
  }
}
