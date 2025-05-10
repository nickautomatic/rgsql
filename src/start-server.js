import net from "node:net";
import Statement from "./statement.js";

function node(type, value) {
  return { type, value };
}

function* parseLiteral(statement) {
  if (statement.consume(/TRUE/)) {
    yield node("BOOLEAN", true);
  }

  if (statement.consume(/FALSE/)) {
    yield node("BOOLEAN", false);
  }

  const n = statement.consume(/-?\d+/);
  if (n !== null) {
    yield node("INTEGER", Number(n));
  }

  const alias = statement.consume(/AS [a-zA-Z\d_]+/);
  if (alias) {
    const value = alias.slice(3);
    if (value.match(/^\d/)) {
      throw new Error("Column names cannot start with a number");
    }
    yield node("ALIAS", value);
  }
}

function parseColumn(statement) {
  return [...parseLiteral(statement)];
}

function parseList(statement) {
  const next = parseColumn(statement);

  if (next.length === 0) return [];

  statement.consume(/^,/);
  return [node("COLUMN", next), ...parseList(statement)];
}

function parse(statement) {
  if (!statement.endsWith(";\x00")) {
    throw new Error("Unexpected characters after statement");
  }

  if (statement.consume(/SELECT/)) {
    return node("SELECT", parseList(statement));
  }

  throw new Error("Unexpected statement");
}

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
