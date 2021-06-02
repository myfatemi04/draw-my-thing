import { Socket } from "socket.io";
import Batcher from "./Batcher";
import { createRoom, Room, rooms } from "./Room";

class Client {
  private _roomID: string;
  private room: Room;
  private username = "anon";
  private movementBatcher = new Batcher((movements) => {
    console.log("sending movement batch of size", movements.length);
    this.broadcast("path-move-batch", movements);
  });
  private color = "black";

  constructor(private readonly socket: Socket) {
    socket.on("create and join room", this.handleCreateAndJoinRoom);
    socket.on("join room", this.handleJoinRoom);
    socket.on("leave room", this.handleLeaveRoom);
    socket.on("disconnect", this.handleDisconnect);
    socket.on("set-color", this.handleSetColor);
    socket.on("clear-canvas", this.handleClearCanvas);
    socket.on("path-start", this.handlePathStart);
    socket.on("path-move", this.handlePathMove);
    socket.on("path-end", this.handlePathEnd);
  }

  private handlePathEnd = () => {
    console.log("path ended for", this.username);
    this.movementBatcher.forceEndBatch();
    this.broadcast("path-ended");
  };

  private handlePathMove = (x: number, y: number) => {
    this.movementBatcher.addToBatch([x, y]);
  };

  private handlePathStart = (x: number, y: number) => {
    console.log("path started at", x, y, "for", this.username);
    this.broadcast("path-started", x, y);
  };

  private handleSetColor = (color: string) => {
    this.color = color;
    this.broadcast("set-color", color);
  };

  private handleClearCanvas = () => {
    console.log(this.username, "cleared the canvas");
    this.broadcast("clear-canvas");
  };

  private handleDisconnect = (reason: string) => {
    console.log(`Client disconnected: ${reason}`);

    if (this._roomID != null) {
      this.leave();
    }
  };

  private emit(event: string, ...args: any[]) {
    this.socket.emit(event, ...args);
  }

  private handleJoinRoom = (roomID: string, username: string) => {
    if (this.roomID != null) {
      console.log(`Client tried to join ${roomID} but was already in a room`);

      this.emit("already-in-room");
    } else if (roomID in rooms) {
      this.username = username;

      this.emit("connected");

      this.join(roomID);
    } else {
      console.log(`Client tried to join ${roomID} but the room does not exist`);

      this.emit("room-not-found");
    }
  };

  private handleCreateAndJoinRoom = (username) => {
    this.username = username;
    if (this._roomID != null) {
      console.log(
        `Client tried to create and join room but was already in a room`
      );

      this.emit("already-in-room");
    } else {
      const roomID = createRoom();

      this.emit("connected");

      this.join(roomID);
    }
  };

  private handleLeaveRoom = () => {
    if (this._roomID == null) {
      console.log(
        `Client tried to leave their current room but was not in a room`
      );
      this.emit("not-in-room");
    } else {
      this.leave();
    }
  };

  get roomID() {
    return this._roomID;
  }

  private broadcast(event: string, ...args: any[]) {
    if (!this.room) {
      console.warn("broadcasting when room not found");
    } else {
      this.room.broadcastAs(this.socket.id, event, ...args);
    }
  }

  private join(roomID: string) {
    this._roomID = roomID;
    this.room = rooms[roomID];
    this.room.join(this.socket, this.username);
    this.socket.join(roomID);

    console.log(`Client joined ${roomID}`);
  }

  private leave() {
    console.log(`Client leaving room ${this._roomID}`);
    this.room.leave(this.socket);
    this._roomID = null;
    this.socket.leave(this._roomID);
  }
}

export default Client;
