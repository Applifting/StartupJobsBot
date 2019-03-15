import { StartupJobsWebhookParser } from "./StartupJobsWebhookParser";
import { mrShark } from "../TestUtils/candidates";

describe("StartupJobsWebhookParser", () => {
  let parser!: StartupJobsWebhookParser;

  beforeEach(() => {
    parser = new StartupJobsWebhookParser();
  });

  describe("Valid candidate", () => {
    it("parses OK", () => {
      expect(parser.parse(mrShark)).toEqual(mrShark);
    });
  });

  describe("Invalid candidate", () => {
    it("throws an error", () => {
      expect(() =>
        parser.parse({ ...mrShark, name: undefined })
      ).toThrowError();
    });
  });
});
