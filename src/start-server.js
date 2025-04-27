import net from "node:net";

class Statement {
  constructor(sql) {
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

  endsWith(str) {
    return this.remaining.endsWith(str);
  }
}

function node(type, value) {
  return { type, value };
}

function parseLiteral(statement) {
  if (statement.consume(/TRUE/)) {
    return node("BOOLEAN", true);
  }

  if (statement.consume(/FALSE/)) {
    return node("BOOLEAN", false);
  }

  const n = statement.consume(/-?\d+/);
  if (n !== null) {
    return node("INTEGER", Number(n));
  }

  const alias = statement.consume(/AS [a-zA-Z\d_]+/);
  if (alias) {
    return node("ALIAS", alias.slice(3));
  }

  return null;
}

function parseColumn(statement) {
  const next = parseLiteral(statement);

  if (next === null) return [];

  return [next, ...parseColumn(statement)];
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
      const column_names = value.map((column) => column.value[1]?.value);

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
