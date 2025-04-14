const express = require("express");
const path = require("path");
const app = express();
const hbs = require("hbs");
const sqlite3 = require("sqlite3").verbose();
var bodyParser = require("body-parser");
hbs.registerHelper("times", function (n, block) {
  var accum = "";
  for (var i = 0; i < n; ++i) accum += block.fn(i);
  return accum;
});

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
        preprend TEXT,
        ancestor_id VARCHAR(50),
        title_include VARCHAR(50),
        updated_after DATE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INT,
        name TEXT,
        content TEXT,
        lastModified DATETIME
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

// if(process.env.PORT == undefined){
//   throw new Error("Environnement variables not found. Run the app with the argument --env-file=.env");
// }

const port = process.env.PORT || 3000;

function getFolders() {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT folders.*, COUNT(files.id) as nb_files FROM folders LEFT JOIN files ON files.folder_id = folders.id GROUP BY folders.id",
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getFiles(folderid) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM files WHERE folder_id = ?",
      [folderid],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

async function render(res, folder = null, file = null) {
  try {
    const folders = await getFolders();
    let files = [];
    let content = null;

    if (folder !== null) {
      const folderIndex = folders.findIndex((v) => v.id === parseInt(folder));
      if (folderIndex !== -1) {
        folders[folderIndex].active = true;
      } else {
        res.status(404).send("Folder Not Found");
        return;
      }

      files = await getFiles(folder);

      if (file !== null) {
        const fileIndex = files.findIndex((v) => v.id === parseInt(file));
        if (fileIndex !== -1) {
          files[fileIndex].active = true;
          content = files[fileIndex].content;
        } else {
          res.status(404).send("File Not Found");
          return;
        }
      }
    }

    res.render("index", {
      folders,
      activeFolder: folder,
      files,
      activeFile: file,
      content,
      message: "Hello from Handlebars!",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data from the database.");
  }
}

// Set view engine
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/folder/:folder", async (req, res) => {
  db.get(
    "SELECT folders.* FROM folders WHERE id = ? ",
    [req.params.folder],
    (err, row) => {
      if (err) res.status(500).send("Error");
      else res.status(200).json(row);
    }
  );
});

app.post("/api/delete/folder/:folder", async (req, res) => {
  var statements = [
    ["DELETE FROM folders WHERE id = ?", req.params.folder],
    ["DELETE FROM files WHERE folder_id = ?", req.params.folder],
  ];

  db.runBatchAsync(statements)
    .then((results) => {
      res.status(200).json({ success: true });
    })
    .catch((err) => {
      console.error("BATCH FAILED: " + err);
      res.status(500).json({ success: false, error: err });
    });
});

app.post(
  "/api/update/folder",
  bodyParser.urlencoded({ extended: true }),
  (req, res) => {
    if (req.body.id == "") {
      db.run(
        "INSERT INTO folders (name,preprend,ancestor_id,title_include,updated_after) VALUES (?,?,?,?,?)",
        [
          req.body.name,
          req.body.prepend,
          req.body.ancestor_id,
          req.body.title_include,
          req.body.updated_after,
        ],
        function (err) {
          if (err == null) {
            res
              .status(200)
              .json({ success: true, action: "create", id: this.lastID });
          } else {
            res.status(500).json({ success: false, error: err });
          }
        }
      );
    } else {
      db.run(
        "UPDATE folders SET name=?,preprend=?,ancestor_id=?,title_include=?,updated_after=? WHERE id=?",
        [
          req.body.name,
          req.body.prepend,
          req.body.ancestor_id,
          req.body.title_include,
          req.body.updated_after,
          req.body.id,
        ],
        function (err) {
          if (err == null) {
            res.status(200).json({ success: true, action: "update" });
          } else {
            res.status(500).json({ success: false, error: err });
          }
        }
      );
    }
  }
);

app.get("/", async (req, res) => {
  render(res);
});

app.get("/folder/:folder", async (req, res) => {
  render(res, req.params.folder);
});

app.get("/folder/:folder/file/:file", async (req, res) => {
  render(res, req.params.folder, req.params.file);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
