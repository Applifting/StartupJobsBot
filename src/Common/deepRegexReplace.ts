import { isObject, clone } from 'lodash';
// util.isError and util.isString were removed in Node.js 23
const isError = (value: any): value is Error => value instanceof Error;
const isString = (value: any): value is string => typeof value === 'string';
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const deepRegexReplace = (value: any, keysAndValues: Array<string>) => {
  if (!isError(value)) {
    value = clone(value);
  } else {
    value.message = deepRegexReplace(value.message, keysAndValues);
    value.name = deepRegexReplace(value.name, keysAndValues);
    if (value.stack) value.stack = deepRegexReplace(value.stack, keysAndValues);
  }

  const redactedPlaceholder = '[REDACTED]';
  if (typeof value === 'undefined' || typeof keysAndValues === 'undefined') return {};

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i = i + 1) {
      value[i] = deepRegexReplace(value[i], keysAndValues);
    }
    return value;
  }

  if (isString(value)) {
    let toReturn = value;
    for (let j = 0; j < keysAndValues.length; j++) {
      const regex = new RegExp(escapeRegExp(keysAndValues[j]), 'gi');
      toReturn = toReturn.replace(regex, redactedPlaceholder);
    }
    return toReturn;
  }

  if (!isObject(value)) {
    return value;
  }

  if (!Array.isArray(keysAndValues)) {
    return value;
  }

  for (let key in value) {
    if (value.hasOwnProperty(key)) {
      let redacted = false;
      for (let j = 0; j < keysAndValues.length; j++) {
        if (key === keysAndValues[j]) {
          value[key] = redactedPlaceholder;
          redacted = true;
        }
      }
      if (!redacted) {
        value[key] = deepRegexReplace(value[key], keysAndValues);
      }
    }
  }

  return value;
};
