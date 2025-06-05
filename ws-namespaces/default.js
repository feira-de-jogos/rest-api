const { ioGame, ioMachine } = require("../http-server.js");

ioGame.of("/").on("connection", async (socket) => {
  console.log("Usuário %s conectado no servidor.", socket.id);

  socket.on("entrar-na-sala", (sala) => {
    socket.join(sala);
    console.log("Usuário %s entrou na sala %s.", socket.id, sala);

    let jogadores = {};
    if (ioGame.sockets.adapter.rooms.get(sala).size === 1) {
      jogadores = {
        primeiro: socket.id,
        segundo: undefined,
      };
    } else if (ioGame.sockets.adapter.rooms.get(sala).size === 2) {
      const [primeiro] = ioGame.sockets.adapter.rooms.get(sala);
      jogadores = {
        primeiro,
        segundo: socket.id,
      };
      console.log(
        "Sala %s com 2 jogadores. Partida pronta para iniciar.",
        sala,
      );
    }

    ioGame.to(sala).emit("jogadores", jogadores);
  });

  socket.on("escolher-personagem", (sala, escolha) => {
    console.log(escolha);
    io.to(sala).emit("personagem-escolhido", escolha);
  });

  socket.on("escolha-publicar", (sala, personagem) => {
    socket.to(sala).emit("escolha-notificar", personagem);
  });

  socket.on("personagem-publicar", (sala, personagem) => {
    socket.to(sala).emit("personagem-notificar", personagem);
  });

  socket.on("estado-publicar", (sala, estado) => {
    socket.to(sala).emit("estado-notificar", estado);
  });

  socket.on("artefatos-publicar", (sala, artefatos) => {
    socket.to(sala).emit("artefatos-notificar", artefatos);
  });

  socket.on("dano-publicar", (sala) => {
    socket.to(sala).emit("dano-notificar");
  });

  socket.on("inimigos-publicar", (sala) => {
    socket.to(sala).emit("inimigos-notificar");
  });

  socket.on("cena-publicar", (sala, cena) => {
    socket.to(sala).emit("cena-notificar", cena);
  });

  socket.on("offer", (sala, description) => {
    socket.to(sala).emit("offer", description);
  });

  socket.on("candidate", (sala, candidate) => {
    socket.to(sala).emit("candidate", candidate);
  });

  socket.on("answer", (sala, description) => {
    socket.to(sala).emit("answer", description);
  });

  socket.on("disconnect", () => {});
});

ioMachine.of("/").use(async (socket) => {
  socket.disconnect();
});
