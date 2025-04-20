import net from "node:net";

const server = net.createServer((socket) => {
  let message = "";

  socket.on("data", (data) => {
    message += data;

    if (message.endsWith("\0")) {
      message = "";
      socket.write("Hello\0");
    }
  });
});

server.listen(3003, "127.0.0.1");
