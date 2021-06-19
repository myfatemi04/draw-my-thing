import { Socket } from "socket.io";
import Batcher from "./Batcher";

class Client {
  private _roomID: string;
  private username = "anon";
  private movementBatcher = new Batcher((movements) => {
    console.log("sending movement batch of size", movements.length);
    this.broadcast("path-move-batch", movements);
  });

  constructor(private readonly socket: Socket) {
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
    this.broadcast("set-color", color);
  };

  private handleClearCanvas = () => {
    console.log(this.username, "cleared the canvas");
    this.broadcast("clear-canvas");
  };

  private handleDisconnect = (reason: string) => {
    console.log(`Client disconnected: ${reason}`);
  };

  get roomID() {
    return this._roomID;
  }

  private broadcast(event: string, ...args: any[]) {
    // if (!this.room) {
    //   console.warn("broadcasting when room not found");
    // } else {
    this.socket.broadcast.emit(event, ...args);
    // }
  }
}

export default Client;
