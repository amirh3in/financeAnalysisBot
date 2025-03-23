import { Server } from 'socket.io'

let participants: { [key: string]: string[] } = {};

const createSocketConnection = (io: Server, server?: any) => {
  io.on("connection", (socket) => {

    server.log.info(
      "connection opeeened"
    )
    console.log('socket started...')
    socket.addListener("join-room", (roomID) => {
      console.log('joining room')
      if (!participants[roomID]) {
        participants[roomID] = [];
      }

      if (participants[roomID].includes(socket.id))
        return;
      console.log('joining room copeleted')

      participants[roomID].push(socket.id);
      socket.join(roomID);

      console.log(socket.id)

      // Broadcast the updated participants count
      io.to(roomID).emit("participant-update", participants[roomID].length);

      socket.addListener("disconnect", () => {
        participants[roomID] = participants[roomID].filter((id) => id !== socket.id);
        io.to(roomID).emit("participant-update", participants[roomID].length);
        socket.leave(roomID);
      });
    });

    socket.addListener("offer", (roomID, description) => {
      socket.to(roomID).emit("offer", socket.id, description);
    });

    socket.addListener("answer", (roomID, description) => {
      socket.to(roomID).emit("answer", socket.id, description);
    });

    socket.addListener("ice-candidate", (roomID, candidate) => {
      socket.to(roomID).emit("ice-candidate", socket.id, candidate);
    });
  });
}

export { createSocketConnection }
