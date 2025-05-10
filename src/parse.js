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
  const value = [...parseLiteral(statement)];
  return value.length ? node("COLUMN", value) : null;
}

function parseList(statement) {
  const column = parseColumn(statement);
  statement.consume(/^,/);
  return column ? [column, ...parseList(statement)] : [];
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

export default parse;
