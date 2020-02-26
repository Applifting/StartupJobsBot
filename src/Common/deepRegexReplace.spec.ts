import { deepRegexReplace } from "./deepRegexReplace";

describe("deep regexp replace", () => {
    const redactedPlaceholder = "[REDACTED]";
    const toBeSanitized = {
        "foo": "bar",
        "sensitive": "secret",
        "verySensitive": "so much secret value inside it is dangerous",
        otherKey: 5,
        somethingElse: false,
        "nested": {
            "baz": "biz",
            "verySensitive": "so much secret value inside it is dangerous",
        }
    }
    
    it("replaces by keys", () => {
        const redacted = deepRegexReplace(toBeSanitized, ['verySensitive']);
        expect(redacted.verySensitive).toEqual(redactedPlaceholder);
    });

    it("replaces by values", () => {
        const redacted = deepRegexReplace(toBeSanitized, ['secret']);
        expect(redacted.verySensitive).toEqual(`so much ${redactedPlaceholder} value inside it is dangerous`);
        expect(redacted.sensitive).toEqual(redactedPlaceholder);
    });

    it("leaves other keys intact", () => {
        const redacted = deepRegexReplace(toBeSanitized, ['secret']);
        expect(redacted.otherKey).toEqual(5);
        expect(redacted.foo).toEqual("bar");
    });

    it("works on nested objects", () => {
        const redacted = deepRegexReplace(toBeSanitized, ['dangerous']);
        expect(redacted.nested.verySensitive).toEqual(`so much secret value inside it is ${redactedPlaceholder}`);
    });
})