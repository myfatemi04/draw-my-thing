import { Socket } from "socket.io/dist/socket";
import ScheduleableEvent from "./ScheduleableEvent";

type Client = {
  socket: Socket;
  username: string;
};

const TEN_MINUTES_IN_MS = 60 * 10 * 1000;
const TEN_SECONDS_IN_MS = 10 * 1000;
const MIN_CLIENTS = 1;

export class Room {
  constructor(public readonly roomID: string) {}
  public readonly clients = new Map<string, Client>();
  private countdown = new ScheduleableEvent(() => {
    this.startRoom();
  });
  private destroyRoom = new ScheduleableEvent(() => {
    console.log("Destroying room", this.roomID, "because of inactivity");
    delete rooms[this.roomID];
  });
  private drawingPlayerID = null as string;
  private roundCount = 0;
  private roundNumber = 0;
  private gameState = "waiting";

  private startRoom() {
    this.broadcastToAll("game-started", this.roundCount);
  }

  private cancelCountdown() {
    if (this.countdown.cancel()) {
      this.broadcastToAll("game-start-cancelled");
    }
  }

  private startCountdown() {
    if (this.countdown.schedule(TEN_SECONDS_IN_MS)) {
      const scheduledStartTime = new Date().getTime() + TEN_SECONDS_IN_MS;
      this.broadcastToAll("game-will-start", scheduledStartTime);
    }
  }

  private broadcastToAll(event: string, ...args: any[]) {
    this.clients.forEach((client) => client.socket.emit(event, ...args));
  }

  private emit(event: string, ...args: any[]) {
    for (let client of this.clients.values()) {
      client.socket.emit(event, ...args);
    }
  }

  join(socket: Socket, username: string) {
    this.clients.set(socket.id, { socket, username });
    this.emit("client joined", socket.id, username);
    this.destroyRoom.cancel();

    this.broadcastAs(socket.id, "player-joined", username);
    const roster = [];
    this.clients.forEach((client) => {
      if (client.socket.id !== socket.id) {
        roster.push([client.socket.id, client.username]);
      }
    });
    socket.emit("player-list", roster);

    if (this.clients.size >= MIN_CLIENTS) {
      this.startCountdown();
    }
  }

  leave(socket: Socket) {
    this.clients.delete(socket.id);
    this.emit("client left", socket.id);

    if (this.clients.size === 0) {
      this.destroyRoom.schedule(TEN_MINUTES_IN_MS);
    } else if (this.clients.size < MIN_CLIENTS) {
      this.cancelCountdown();
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
/**
 * Creates a new room.
 * @returns {string} The room ID
 */
export function createRoom(): string {
  const roomID = roomIDCounter;
  rooms[roomID] = new Room(String(roomID));
  roomIDCounter += 1;
  return String(roomID);
}

export const rooms: Record<string, Room> = {};
