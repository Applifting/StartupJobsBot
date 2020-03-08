import { SlackIntegrationCheckResult } from "../../utils/apiModel";

const SlackIntegrationStatus = (props: {
  status: SlackIntegrationCheckResult;
}) => {
  let status = props.status;
  return (
    <div>
      {status == SlackIntegrationCheckResult.FORBIDDEN && (
        <div>
          ❌ Slack Webhook URL je pravděpodobně špatně.{" "}
          <i>
            Mrkni na{" "}
            <a
              target="_NEW"
              href="https://api.slack.com/legacy/custom-integrations/incoming-webhooks"
            >
              slack dokumentaci
            </a>
            a oprav proměnnou SLACK_WEBHOOK_URL.
          </i>
        </div>
      )}
      {status == SlackIntegrationCheckResult.INVALID_SLACK_URL && (
        <div>
          ❌ Slack Webhook URL není platná.{" "}
          <i>Oprav proměnnou SLACK_WEBHOOK_URL.</i>
        </div>
      )}
      {status == SlackIntegrationCheckResult.SLACK_NOT_AVAILABLE && (
        <div>⚠️ Slack není v tuto chvíli dostupný. Možná má výpadek.</div>
      )}
      {status == SlackIntegrationCheckResult.NOT_SET_UP && (
        <div>➖ Slack integrace není nastavena.</div>
      )}
      {status == SlackIntegrationCheckResult.UNKNOWN_ERROR && (
        <div>❌ Slack: Neznámá chyba.</div>
      )}
      {status == SlackIntegrationCheckResult.OK && (
        <div>✅ Slack integrace je funkční.</div>
      )}
    </div>
  );
};

export default SlackIntegrationStatus;
