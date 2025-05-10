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

export default Statement;
