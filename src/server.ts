import socketio, { Socket } from "socket.io";
import * as http from "http";

type Client = {
  socket: Socket;
  username: string;
};

const SIXTY_MINUTES_IN_MS = 10 * 60 * 1000;

class Room {
  constructor(public readonly roomID: string) {}
  private clients = new Map<string, Client>();
  private roomDestructionTimerID: NodeJS.Timeout = null;

  private startRoomDestructionTimer() {
    if (this.roomDestructionTimerID == null) {
      setTimeout(() => {
        console.log("Destroying room", this.roomID, "because of inactivity");
        delete rooms[this.roomID];
      }, SIXTY_MINUTES_IN_MS);
    }
  }

  private stopRoomDestructionTimer() {
    if (this.roomDestructionTimerID != null) {
      clearTimeout(this.roomDestructionTimerID);
    }
  }

  private emit(event: string, ...args: any[]) {
    for (let client of this.clients.values()) {
      client.socket.emit(event, ...args);
    }
  }

  join(socket: Socket, username: string) {
    this.clients.set(socket.id, { socket, username });
    this.emit("client joined", socket.id, username);
    this.stopRoomDestructionTimer();
  }

  leave(socket: Socket) {
    this.clients.delete(socket.id);
    this.emit("client left", socket.id);

    if (this.clients.size === 0) {
      this.startRoomDestructionTimer();
    }
  }
}

const rooms: Record<string, Room> = {};

const httpServer = new http.Server();

const io = new socketio.Server(httpServer, {
  cors: {
    origin: "*",
  },
});

let roomIDCounter = 0;

httpServer.listen(7000, () => {
  console.log(`Listening on 7000`);
});

io.on("connection", (socket) => {
  console.log(`Client connected`);

  let currentRoomID: string = null;
  let room: Room = null;

  function leaveRoom() {
    console.log(`Client leaving room ${currentRoomID}`);
    room.leave(socket);
    currentRoomID = null;
  }

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${reason}`);

    if (currentRoomID != null) {
      leaveRoom();
    }
  });

  socket.on("join room", (roomID) => {
    if (currentRoomID != null) {
      console.log(`Client tried to join ${roomID} but was already in a room`);

      socket.emit("already in room");
    } else if (roomID in rooms) {
      console.log(`Client joined ${roomID}`);

      currentRoomID = roomID;
      room = rooms[roomID];
    } else {
      console.log(`Client tried to join ${roomID} but the room does not exist`);

      socket.emit("room not found");
    }
  });

  socket.on("create and join room", () => {
    if (currentRoomID != null) {
      console.log(
        `Client tried to create and join room but was already in a room`
      );
    } else {
      const roomID = "R" + roomIDCounter;

      currentRoomID = roomID;
      room = new Room(roomID);

      rooms[roomID] = room;
      roomIDCounter += 1;

      console.log(`Client created and joined room ${roomID}`);
    }
  });

  socket.on("leave room", () => {
    if (currentRoomID == null) {
      console.log(
        `Client tried to leave their current room but was not in a room`
      );
      socket.emit("not in room");
    } else {
      leaveRoom();
    }
  });
});
