import { useEffect, useState } from "react";

const ModifyOnHerokuButton = () => {
  const [appName, setAppName] = useState("");
  useEffect(() => {
    setAppName(window.location.host);
  }, []);
  return (
    <a
      href={`https://dashboard.heroku.com/apps/${appName}/settings`}
      target="_NEW"
    >
      <button>Uprav nastavení na Heroku</button>
    </a>
  );
};

export default ModifyOnHerokuButton;
