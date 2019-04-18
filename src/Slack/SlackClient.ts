import { StartupJobsPayload } from "../StartupJobs/webhookPayload";
import axios, { AxiosPromise } from "axios";
import { SlackConfig } from "./SlackConfig";
import url from "url";
import { inspect } from "util";
import { ISlackClient } from "./ISlackClient";

export class SlackClient implements ISlackClient {
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    this.config = config;
  }

  public sendCandidateToSlack(
    candididate: StartupJobsPayload
  ): AxiosPromise<any> {
    const title = this.config.messageTitle || "Nový kandidát!";
    const payload = {
      text: `${title}\n${candididate.name} chce být ${
        candididate.position
      }\n\n\n:phone: ${candididate.phone}\n:email: ${candididate.email}\n`,
      attachments: [
        {
          fallback: `${candididate.why}`,
          color: "#6B97CA",
          title: "Proč já:question:",
          text: `${candididate.why}`
        },
        {
          fallback: `${candididate.details}`,
          title: "Odkazy",
          text: SlackClient.assembleLinks(candididate)
        }
      ]
    };
    return axios.post(this.config.webhookUrl, payload);
  }

  public static assembleLinks(candididate: StartupJobsPayload): string {
    const links: string[] = [];
    if (candididate.files) {
      candididate.files.map(f => {
        const name = decodeURIComponent(<string>url.parse(f, true).query!.file);
        links.push(`<${f}|${name}>`);
      });
    }
    if (candididate.linkedin) {
      links.push(`<${candididate.linkedin}|LinkedIn>`);
    }
    links.push(`<${candididate.details}|StartupJobs>`);
    const linksText = links.join(" | ");
    return linksText;
  }
}
