import * as http from "http";
import socketio from "socket.io";
import Client from "./Client";

const httpServer = new http.Server();

const io = new socketio.Server(httpServer, {
  cors: {
    origin: "*",
  },
});

httpServer.listen(7000, () => {
  console.log(`Listening on 7000`);
});

io.on("connection", (socket) => {
  console.log(`Client connected`);
  new Client(socket);
});
