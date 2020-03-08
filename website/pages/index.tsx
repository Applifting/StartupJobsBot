import { useForm } from "react-hook-form";
import BotStatus from "../components/BotStatus";

const Home = () => {
  const { register, handleSubmit, watch, errors } = useForm();
  const current = watch();
  console.log(current);

  const onSubmit = data => {
    console.log(data);
  };
  return (
    <div>
      <h1>Hello world!</h1>
      <BotStatus></BotStatus>
      <input
        name="textInput"
        ref={register({ required: true, maxLength: 50 })}
      />
      <div>
        <a href="https://heroku.com/deploy?template=https://github.com/heroku/node-js-getting-started">
          <img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy" />
        </a>
      </div>
    </div>
  );
};

export default Home;
