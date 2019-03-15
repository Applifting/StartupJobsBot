import Joi from "joi";
import { join } from "path";
/*
 Webhooks
Na StartupJobs.cz můžete využít webhooks pro získání informace o přihlášeném zájemci. 
Adresu webhooku je možné nastavit při úpravě každé nabídky v sekci další možnosti. 
Webhook odesílá data o zájemci ve formátu JSON.
*/

export interface StartupJobsPayload {
  ///"2017-09-11T18:19:15+02:00"
  date: string;
  /// 12345
  candidateID: number;
  /// 1234
  offerID: number;
  /// "Pan Žralok"
  name: string;
  /// "Vývojář webhooků"
  position: string;
  /// "Chci se stát vývojářem webhooků na StartupJobs.cz, protože mě to baví!",
  why: string;
  /// "+420 725 875 752",
  phone: string;
  /// "dev@startupjobs.cz",
  email: string;
  /// "https:\/\/www.startupjobs.cz\/admin\/zajemce\/32437?oid=4332",
  details: string;
  /// "https://linkedin.com/pan-zralok"
  linkedin: string;
  /// "JOB1"
  internalPositionName: string;
  /// ["https:\/\/www.startupjobs.cz\/download-file?file=my-cv.pdf&hash=816dc09a57ad42048c"]
  files: string[];
  /// True/False
  gdpr_accepted: boolean;
}

export const startupJobsPayloadSchema = Joi.object().keys({
  date: Joi.string().required(),
  candidateID: Joi.number().required(),
  offerID: Joi.number().required(),
  name: Joi.string()
    .required()
    .trim(),
  position: Joi.string()
    .required()
    .trim(),
  why: Joi.string().trim(),
  phone: Joi.string().required(),
  email: Joi.string()
    .email()
    .trim(),
  details: Joi.string().required(),
  linkedin: Joi.string().trim(),
  internalPositionName: Joi.string().trim(),
  files: Joi.array().items(Joi.string()),
  gdpr_accepted: Joi.boolean().required()
});