import * as http from "http";
import socketio from "socket.io";
import Batcher from "./Batcher";
import Client from "./Client";
import { createRoom, Room, rooms } from "./Room";

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
  const client = new Client(socket);
});
