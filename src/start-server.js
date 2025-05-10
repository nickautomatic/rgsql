import net from "node:net";
import Statement from "./statement.js";
import parse from "./parse.js";

function run({ type, value }) {
  switch (type) {
    case "SELECT": {
      const rows = [value.map((column) => column.value[0].value)];
      const column_names = value.map((column) => {
        const alias = column.value.find((node) => node.type === "ALIAS");
        return alias?.value;
      });

      return {
        rows,
        column_names,
      };
    }
  }
}

const server = net.createServer((socket) => {
  let message = "";

  function send(response) {
    socket.write(`${JSON.stringify(response)}\0`);
  }

  socket.on("data", (data) => {
    message += data;

    if (message.endsWith("\0")) {
      try {
        const ast = parse(new Statement(message));
        // console.log(ast);
        const response = run(ast);
        // console.log(response);

        send({
          status: "ok",
          ...response,
        });
      } catch (error) {
        send({
          status: "error",
          error_type: "parsing_error",
          error_message: error.toString(),
        });
      }

      message = "";
    }
  });
});

server.listen(3003, "127.0.0.1");
