import net from "node:net";

function node(type, value) {
  return { type, value };
}

function parseLiteral(statement) {
  if (statement.startsWith("TRUE")) {
    return true;
  }

  if (statement.startsWith("FALSE")) {
    return false;
  }

  let n;

  if ((n = statement.match(/^-?\d+/))) {
    return Number(n);
  }
}

function parseList(statement) {
  if (statement === "\x00") {
    return [];
  }

  if (!statement.endsWith(";\x00")) {
    throw new Error("Unexpected characters after statement");
  }

  return statement
    .split(",")
    .map((literal) => parseLiteral(literal.trimStart()));
}

function parse(statement) {
  if (statement.startsWith("SELECT")) {
    return node("SELECT", parseList(statement.slice(7)));
  }

  throw new Error("Unexpected statement");
}

function run(ast) {
  switch (ast.type) {
    case "SELECT":
      return {
        rows: [ast.value],
        column_names: [],
      };
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
        const ast = parse(message);
        const response = run(ast);

        send({
          status: "ok",
          ...response,
        });
      } catch (error) {
        send({
          status: "error",
          error_type: "parsing_error",
          error_message: error,
        });
      }

      message = "";
    }
  });
});

server.listen(3003, "127.0.0.1");
