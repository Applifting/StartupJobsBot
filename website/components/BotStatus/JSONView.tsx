import { Component } from "react";

const JSONView = (props: { json: any }) => {
  return (
    <div>
      <pre>{JSON.stringify(props.json, null, 2)}</pre>
    </div>
  );
};

export default JSONView;
