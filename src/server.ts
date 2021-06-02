import socketio, { Socket } from "socket.io";
import * as http from "http";
import Batcher from "./Batcher";

type Client = {
  socket: Socket;
  username: string;
};

const SIXTY_MINUTES_IN_MS = 10 * 60 * 1000;

class Room {
  constructor(public readonly roomID: string) {}
  public readonly clients = new Map<string, Client>();
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

function createRoom() {
  const roomID = "R" + roomIDCounter;
  rooms[roomID] = new Room(roomID);
  roomIDCounter += 1;
  return roomID;
}

io.on("connection", (socket) => {
  console.log(`Client connected`);

  let currentRoomID: string = null;
  let room: Room = null;
  let username: string = "rando";

  const movementBatcher = new Batcher((movements) => {
    console.log("sending movement batch of size", movements.length);
    broadcast("path-move-batch", movements);
  });

  function leaveRoom() {
    console.log(`Client leaving room ${currentRoomID}`);
    room.leave(socket);
    currentRoomID = null;
    socket.leave(currentRoomID);
  }

  function broadcast(event: string, ...params: any[]) {
    socket.broadcast.in(currentRoomID).emit(event, ...params);
  }

  function joinedRoom(roomID: string) {
    currentRoomID = roomID;
    room = rooms[roomID];
    room.join(socket, username);
    socket.join(roomID);
    socket.emit("connected");
    console.log(`Client joined ${roomID}`);
    broadcast("player-joined", socket.id, username);
    const roster = [];
    room.clients.forEach((client) => {
      if (client.socket.id !== socket.id) {
        roster.push([client.socket.id, client.username]);
      }
    });
    socket.emit("player-list", roster);
  }

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${reason}`);

    if (currentRoomID != null) {
      leaveRoom();
    }
  });

  socket.on("join room", (roomID, nickname) => {
    if (currentRoomID != null) {
      console.log(`Client tried to join ${roomID} but was already in a room`);

      socket.emit("already-in-room");
    } else if (roomID in rooms) {
      username = nickname;
      joinedRoom(roomID);
    } else {
      console.log(`Client tried to join ${roomID} but the room does not exist`);

      socket.emit("room-not-found");
    }
  });

  socket.on("create and join room", (nickname) => {
    if (currentRoomID != null) {
      console.log(
        `Client tried to create and join room but was already in a room`
      );

      socket.emit("already-in-room");
    } else {
      const roomID = createRoom();
      joinedRoom(roomID);
    }
  });

  socket.on("leave room", () => {
    if (currentRoomID == null) {
      console.log(
        `Client tried to leave their current room but was not in a room`
      );
      socket.emit("not-in-room");
    } else {
      leaveRoom();
    }
  });

  socket.on("set-color", (color) => {
    console.log(username, "set color to", color);
    broadcast("set-color", color);
  });

  socket.on("clear-canvas", () => {
    console.log(username, "cleared the canvas");
    broadcast("clear-canvas");
  });

  socket.on("path-start", (x: number, y: number) => {
    console.log("path started at", x, y, "for", username);
    broadcast("path-started", x, y);
  });

  socket.on("path-move", (x: number, y: number) => {
    movementBatcher.addToBatch([x, y]);
  });

  socket.on("path-end", () => {
    console.log("path ended for", username);
    movementBatcher.forceEndBatch();
    broadcast("path-ended");
  });
});
