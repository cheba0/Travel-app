// socket.js
let io = null;

module.exports = {
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io не инициализирован!");
    }
    return io;
  },
  setIO: (socketIO) => {
    io = socketIO;
  },
};
