import { isObject,cloneDeep } from "lodash";
import { isString } from "util";

export const deepRegexReplace = (value: any, keysAndValues: Array<string>) => {
    value = cloneDeep(value);
    const redactedPlaceholder = '[REDACTED]';
    if (typeof value === 'undefined' || typeof keysAndValues === 'undefined') return {};
  
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i = i + 1) {
        value[i] = deepRegexReplace(value[i], keysAndValues);
      }
      return value;
    }
  
    if (!isObject(value)) {
      return value;
    }
  
    if (!Array.isArray(keysAndValues)) {
      return value;
    }
  
    for (let j = 0; j < keysAndValues.length; j++) {
      for (let key in value) {
        if (value.hasOwnProperty(key)) {
          if (new RegExp(keysAndValues[j],'i').test(key)) value[key] = redactedPlaceholder;
          if(isString(value[key])){
            const regex = new RegExp(keysAndValues[j],'gi');
            value[key] = (value[key] as string).replace(regex, redactedPlaceholder);
          }
        }
      }
    }
  
    for (let key in value) {
      if (value.hasOwnProperty(key)) {
        value[key] = deepRegexReplace(value[key], keysAndValues);
      }
    }
  
    return value;
  };
