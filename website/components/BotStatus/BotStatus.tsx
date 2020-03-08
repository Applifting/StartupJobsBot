import fetch from "isomorphic-unfetch";
import { useEffect, useState } from "react";
import { HealthCheckResult, AppStatus } from "../../utils/apiModel";
import JSONView from "./JSONView";
import { apiBasePath } from "../../utils/apiBasePath";
import SlackIntegrationStatus from "./SlackIntegrationStatus";
import RecruiteeIntegrationStatus from "./RecruiteeIntegrationStatus";
import ModifyOnHerokuButton from "./ModifyOnHerokuButton";

const BotStatus = () => {
  const [appStatus, setAppStatus] = useState<HealthCheckResult | undefined>();

  useEffect(() => {
    const fetchStatus = async () => {
      const response = await fetch(`${apiBasePath()}/health`);
      setAppStatus(await response.json());
    };
    fetchStatus();
  }, []);

  let appStatusText = "Zjišťuji stav";

  return (
    <div>
      <h2>StartupJobs BOT</h2>
      {!appStatus ? (
        <div>Zjišťuji stav...</div>
      ) : (
        <div>
          {appStatus.status == AppStatus.UP ? (
            <div>👍 Vše je v pořádku.</div>
          ) : (
            <div>⚠️ Něco není v pořádku</div>
          )}
          <div>
            <SlackIntegrationStatus status={appStatus.slack} />
            <RecruiteeIntegrationStatus status={appStatus.recruitee} />
          </div>
          {appStatus.status == AppStatus.DOWN && (
            <div>
              <p>Technický detail:</p>
              <JSONView json={appStatus} />
            </div>
          )}
        </div>
      )}
      <div>
        <div>
          <ModifyOnHerokuButton />
        </div>
      </div>
    </div>
  );
};

export default BotStatus;
