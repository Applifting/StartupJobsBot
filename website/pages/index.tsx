import { useForm } from "react-hook-form";
import BotStatus from "../components/BotStatus/BotStatus";

const Home = () => {
  const { register, handleSubmit, watch, errors } = useForm();
  const current = watch();
  return (
    <div>
      <h1>🤖 Startup Jobs Bot</h1>
      <BotStatus></BotStatus>
    </div>
  );
};

export default Home;
