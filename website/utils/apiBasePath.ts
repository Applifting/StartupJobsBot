export const apiBasePath = () => {
  if (process.env.API_BASE_PATH) {
    return process.env.API_BASE_PATH;
  }
  if (process.env.NODE_ENV == "production") {
    return "";
  } else {
    return "http://localhost:3000";
  }
};
