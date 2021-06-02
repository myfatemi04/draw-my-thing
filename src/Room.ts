import { Socket } from "socket.io/dist/socket";

type Client = {
  socket: Socket;
  username: string;
};

const SIXTY_MINUTES_IN_MS = 10 * 60 * 1000;

export class Room {
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

    this.broadcastAs(socket.id, "player-joined", username);
    const roster = [];
    this.clients.forEach((client) => {
      if (client.socket.id !== socket.id) {
        roster.push([client.socket.id, client.username]);
      }
    });
    socket.emit("player-list", roster);
  }

  leave(socket: Socket) {
    this.clients.delete(socket.id);
    this.emit("client left", socket.id);

    if (this.clients.size === 0) {
      this.startRoomDestructionTimer();
    }
  }

  broadcastAs(id: string, event: string, ...args: any[]) {
    this.clients.forEach((client) => {
      if (client.socket.id !== id) {
        client.socket.emit(event, ...args);
      }
    });
  }
}

let roomIDCounter = 0;
export function createRoom() {
  const roomID = "R" + roomIDCounter;
  rooms[roomID] = new Room(roomID);
  roomIDCounter += 1;
  return roomID;
}

export const rooms: Record<string, Room> = {};
