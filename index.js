const { startApp } = require("./src/app");

startApp().catch((error) => {
  console.error("Error iniciando la app:", error);
  process.exit(1);
});
