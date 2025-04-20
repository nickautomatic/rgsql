import net from "node:net";

function node(type, value) {
  return { type, value };
}

function parseLiteral(statement) {
  if (statement.startsWith(";") || statement.startsWith("\x00")) {
    return [];
  }

  if (statement.startsWith("TRUE")) {
    return node("BOOLEAN", true);
  }

  if (statement.startsWith("FALSE")) {
    return node("BOOLEAN", false);
  }

  let n;

  if ((n = statement.match(/^-?\d+/))) {
    return node("INTEGER", Number(n));
  }
}

function parseList(statement) {
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

const server = net.createServer((socket) => {
  let message = "";

  socket.on("data", (data) => {
    message += data;

    if (message.endsWith("\0")) {
      const ast = parse(message);
      console.log(ast);

      message = "";
      socket.write("Hello\0");
    }
  });
});

server.listen(3003, "127.0.0.1");
