import { CandidateAnonymizer } from "./CandidateAnonymizer";
import { mrShark } from "../TestUtils/candidates";

describe("CandidateAnonymizer", () => {
  it("Anonymizes the candidate", () => {
    const anonymizer = new CandidateAnonymizer();
    const result = anonymizer.anonymize(mrShark);
    expect(result).toEqual({
      ...mrShark,
      name: "<<anonymized name>>",
      phone: "<<anonymized phone>>",
      email: "<<anonymized email>>"
    });
  });
});
