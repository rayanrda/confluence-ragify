const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./confluencedb.sqlite", (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to SQLite DB.");

    // Create a sample table if not exists
    db.run(`
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        space TEXT,
        prepend TEXT,
        ancestor_id VARCHAR(50),
        title_include VARCHAR(50),
        updated_after DATE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS files (
        external_id VARCHAR(50) PRIMARY KEY,
        folder_id INTEGER,
        name TEXT,
        content TEXT,
        lastModified DATETIME,
        exclude INTEGER DEFAULT 0,
        validated INTEGER DEFAULT 0,
        oa_gpt_id VARCHAR(50) NULL

      )
    `);
  }
});

sqlite3.Database.prototype.runAsync = function (sql, ...params) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
};

sqlite3.Database.prototype.runBatchAsync = function (statements) {
  var results = [];
  var batch = ["BEGIN", ...statements, "COMMIT"];
  return batch
    .reduce(
      (chain, statement) =>
        chain.then((result) => {
          results.push(result);
          return db.runAsync(...[].concat(statement));
        }),
      Promise.resolve()
    )
    .catch((err) =>
      db
        .runAsync("ROLLBACK")
        .then(() => Promise.reject(err + " in statement #" + results.length))
    )
    .then(() => results.slice(2));
};

module.exports = db