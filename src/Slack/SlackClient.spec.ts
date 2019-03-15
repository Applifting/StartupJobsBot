import { SlackClient } from "./SlackClient";
import { mrShark } from "../TestUtils/candidates";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

describe("SlackClient", () => {
  describe("Link creation", () => {
    it("creates links", () => {
      expect(SlackClient.assembleLinks(mrShark)).toEqual(
        "<https://www.startupjobs.cz/download-file?file=my-cv.pdf&hash=816dc09a57ad42048c|my-cv.pdf> | <https://linkedin.com/pan-zralok|LinkedIn> | <https://www.startupjobs.cz/admin/zajemce/32437?oid=4332|StartupJobs>"
      );
    });
  });

  describe("Posting", () => {
    const mock = new MockAdapter(axios);

    beforeAll(() => {
      mock.onPost("/test").reply(200);
    });

    it("sends the webhook payload", async () => {
      const client = new SlackClient({ webhookUrl: "/test" });
      await client.sendCandidateToSclack(mrShark);
      const expectedPayload = {
        text:
          "Nový kandidát!\nPan Žralok chce být Vývojář webhooků\n\n\n:phone: +420 725 875 752\n:email: dev@startupjobs.cz\n",
        attachments: [
          {
            fallback:
              "Chci se stát vývojářem webhooků na StartupJobs.cz, protože mě to baví!",
            color: "#6B97CA",
            title: "Proč já:question:",
            text:
              "Chci se stát vývojářem webhooků na StartupJobs.cz, protože mě to baví!"
          },
          {
            fallback: "https://www.startupjobs.cz/admin/zajemce/32437?oid=4332",
            title: "Odkazy",
            text:
              "<https://www.startupjobs.cz/download-file?file=my-cv.pdf&hash=816dc09a57ad42048c|my-cv.pdf> | <https://linkedin.com/pan-zralok|LinkedIn> | <https://www.startupjobs.cz/admin/zajemce/32437?oid=4332|StartupJobs>"
          }
        ]
      };
      expect(mock.history.post[0].data).toBe(JSON.stringify(expectedPayload));
    });

    afterAll(() => {
      mock.restore();
    });
  });
});
