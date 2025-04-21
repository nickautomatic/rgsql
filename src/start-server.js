import net from "node:net";

class Statement extends String {
  constructor(sql) {
    super(sql);
    this.remaining = sql;
  }

  consume(pattern) {
    const regex = new RegExp(`^${pattern.source}`);
    const match = this.remaining.match(regex);

    if (match) {
      this.remaining = this.remaining.slice(match[0].length).trimStart();
      return match[0];
    }

    return null;
  }
}

function node(type, value) {
  return { type, value };
}

function parseLiteral(statement) {
  if (statement.consume(/TRUE/)) {
    return true;
  }

  if (statement.consume(/FALSE/)) {
    return false;
  }

  const n = statement.consume(/-?\d+/);

  if (n !== null) {
    return Number(n);
  }

  return null;
}

function parseList(statement) {
  const next = parseLiteral(statement);

  if (next === null) return [];

  statement.consume(/^,/);
  return [next, ...parseList(statement)];
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
        const ast = parse(new Statement(message));
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
