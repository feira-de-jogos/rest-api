const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const authBearerParser = require("auth-bearer-parser").default;

const app = express();
const httpServer = createServer(app);
const cors = require("cors");
const ioGame = new Server(httpServer, {
  path: "/api/v2/game/",
  cors: { origin: "*" },
});
const ioMachine = new Server(httpServer, {
  path: "/api/v2/machine/",
  cors: { origin: "*" },
});

app.use(
  cors({
    origin: /feira-de-jogos\.dev\.br$/,
    methods: "POST",
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(authBearerParser());

module.exports = { app, httpServer, ioGame, ioMachine };
