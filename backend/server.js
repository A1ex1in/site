const app = require("./app");
const config = require("./config");

app.listen(config.port, () => {
    console.log(`Backend запущен: http://127.0.0.1:${config.port}`);
});
