import { RecruiteeIntegrationCheckResult } from "../utils/apiModel";

const RecruiteeIntegrationStatus = (props: {
  status: RecruiteeIntegrationCheckResult;
}) => {
  let status = props.status;
  return (
    <div>
      {status == RecruiteeIntegrationCheckResult.BAD_ACCESS_TOKEN && (
        <div>
          ❌ Recruitee access token není platný.{" "}
          <i>
            Mrkni na{" "}
            <a
              target="_NEW"
              href="https://docs.recruitee.com/reference#section-generate-api-token"
            >
              dokumentaci jak vygenerovat platný token a oprav proměnnou
              RECRUITEE_ACCESS_TOKEN.
            </a>
            .
          </i>
        </div>
      )}
      {status == RecruiteeIntegrationCheckResult.BAD_COMPANY_DOMAIN && (
        <div>
          ❌ Recruitee doména není správně zadaná a nebo není vaše.
          <i>
            Mrkni na{" "}
            <a
              target="_NEW"
              href="https://docs.recruitee.com/reference#section-using-the-api-token"
            >
              dokumentaci jak zjistit vaši firemní Recruitee doménu a oprav
              proměnnou RECRUITEE_DOMAIN.
            </a>
            .
          </i>
        </div>
      )}
      {status == RecruiteeIntegrationCheckResult.RECRUITEE_NOT_AVAILABLE && (
        <div>⚠️ Recruitee není v tuto chvíli dostupné. Možná má výpadek.</div>
      )}
      {status == RecruiteeIntegrationCheckResult.NOT_SET_UP && (
        <div>➖ Recruitee integrace není nastavena.</div>
      )}
      {status == RecruiteeIntegrationCheckResult.UNKNOWN_ERROR && (
        <div>❌ Recruitee: Neznámá chyba.</div>
      )}
      {status == RecruiteeIntegrationCheckResult.OK && (
        <div>✅ Recruitee integrace je funkční.</div>
      )}
    </div>
  );
};

export default RecruiteeIntegrationStatus;
