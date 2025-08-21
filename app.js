const express = require("express");
const path = require("path");
const hbs = require("hbs");
const db = require("./helpers/db.js");
const helpers = require("./helpers/helpers.js");
const WebSocket = require('ws');
const http = require('http');
const Confluence = require('./helpers/confluence.js');
const fs = require('fs');
const { mdToPdf } = require('md-to-pdf');
const sanitize = require("sanitize-filename");
const FormData = require('form-data');
const axios = require('axios');

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

var bodyParser = require("body-parser");
hbs.registerHelper("times", function (n, block) {
  var accum = "";
  for (var i = 0; i < n; ++i) accum += block.fn(i);
  return accum;
});


const port = process.env.PORT || 3000;


app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));



app.get("/api/folder/:folder", async (req, res) => {
  helpers.getFolder(req.params.folder)
    .then((row) => {
      res.status(200).json(row)
    })
    .catch((err) => {
      res.status(500).send("Error")
    });
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



app.post("/api/save/file/:file", bodyParser.urlencoded({ extended: true, limit: "50mb" }), async (req, res) => {


  helpers.getFile(req.params.file).then(async (file) => {
    if (file == undefined) {
      res.status(404).json({ success: false });
    } else {
      const pdf = await mdToPdf({ content: file.content }, { dest: `./export/${sanitize(file.name)}.pdf` });


      if (file.oa_gpt_id !== undefined && file.oa_gpt_id !== null) {
        try{
                  const delete_file = await axios.delete(`https://gpt.loreal.net/v1/contexts/ngl_ai_companion_lusa-np/files/${file.oa_gpt_id}`, {
          headers: {
            "Cookie": `${process.env.OAGPT_COOKIE}`,
          },
        });
      }catch(error){}
      }

      var form = new FormData();
      form.append("file", fs.createReadStream(`./export/${sanitize(file.name)}.pdf`), `${sanitize(file.name)}.pdf`);
      const formHeaders = form.getHeaders();


      const response = await axios.post('https://gpt.loreal.net/v1/contexts/ngl_ai_companion_lusa-np/configs/documentation/files', form, {
        headers: {
          ...formHeaders,
          "Cookie": `${process.env.OAGPT_COOKIE}`,
        },
      });


      const metadata = await axios.post(`https://gpt.loreal.net/v1/contexts/ngl_ai_companion_lusa-np/configs/documentation/files/${response.data.file_id}/metadata`, new FormData(), {
        headers: {
          ...formHeaders,
          "Cookie": `${process.env.OAGPT_COOKIE}`,
        },
      });

      const vector = await axios.post(`https://gpt.loreal.net/v1/contexts/ngl_ai_companion_lusa-np/configs/vectorstore/files/${response.data.file_id}/vectorstores`, new FormData(), {
        headers: {
          ...formHeaders,
          "Cookie": `${process.env.OAGPT_COOKIE}`,
        },
      });


      db.run("UPDATE files SET validated=1,exclude=0,content=?,oa_gpt_id=? WHERE external_id=?", [req.body.md, response.data.file_id, req.params.file]);

      res.status(200).json({ success: true });
    }
  });








});

app.post("/api/exclude/file/:file", async (req, res) => {
  db.run(
    "UPDATE files SET exclude=1,oa_gpt_id=null WHERE external_id=?", [req.params.file],
    function (err) {
      if (err == null) {
        helpers.getFile(req.params.file).then((file) => {
          if (file.oa_gpt_id !== undefined && file.oa_gpt_id !== null) {
            const delete_file = axios.delete(`https://gpt.loreal.net/v1/contexts/ngl_ai_companion_lusa-np/files/${file.oa_gpt_id}`, {
              headers: {
                "Cookie": `${process.env.OAGPT_COOKIE}`,
              },
            });
          }
        });

      
  

        res.status(200).json({ success: true });
      } else {

        res.status(500).json({ success: false });
      }
    }
  );
});

app.post("/api/include/file/:file", async (req, res) => {
  db.run(
    "UPDATE files SET exclude=0 WHERE external_id=?", [req.params.file],
    function (err) {
      if (err == null) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ success: false });
      }
    }
  );
});



app.post(
  "/api/update/folder",
  bodyParser.urlencoded({ extended: true }),
  (req, res) => {
    if (req.body.id == "") {
      db.run(
        "INSERT INTO folders (name,prepend,ancestor_id,title_include,updated_after,space) VALUES (?,?,?,?,?,?)",
        [
          req.body.name,
          req.body.prepend,
          req.body.ancestor_id,
          req.body.title_include,
          req.body.updated_after,
          req.body.space
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
        "UPDATE folders SET name=?,prepend=?,ancestor_id=?,title_include=?,updated_after=?,space=? WHERE id=?",
        [
          req.body.name,
          req.body.prepend,
          req.body.ancestor_id,
          req.body.title_include,
          req.body.updated_after,
          req.body.space,
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
  helpers.render(res);
});


app.post("/api/fetch/file/:file", async (req, res) => {
  helpers.getFile(req.params.file).then(async (file) => {
    const page = await Confluence.fetchPage(file.external_id);
    if (page == undefined) {
      res.status(404).json({ success: false });
    } else {
      const row = await helpers.getFolder(file.folder_id);
      const markdown = Confluence.formatPage(page, row);
      const date = page.version.when;
      const title = page.title;
      const external_id = page.id;
      db.run("UPDATE files SET name=?,content=?,lastModified=?,validated=0 WHERE external_id = ? ", title, markdown, date, external_id);
      res.status(200).json({ success: true });
    }
  });
});

app.get("/folder/:folder", async (req, res) => {
  helpers.render(res, req.params.folder);
});

app.get("/folder/:folder/file/:file", async (req, res) => {
  helpers.render(res, req.params.folder, req.params.file);
});




wss.on('connection', (ws, req) => {

  ws.on('message', (message) => {
    const json = JSON.parse(message);
    if (json.action == 'update-file') {

      helpers.getFolder(json.folderid)
        .then((row) => {
          Confluence.fetchPages(row, 0, 0).then(async (init) => {
            const totalSize = init.totalSize;
            const perPage = 10;
            ws.send(JSON.stringify({ action: 'init', "totalSize": totalSize }));

            for (let i = 0; i < Math.ceil(totalSize / perPage); i++) {
              const response = await Confluence.fetchPages(row, i * perPage, perPage);
              const pages = response.results;
              for (let y = 0; y < pages.length; y++) {
                const page = pages[y];
                const markdown = Confluence.formatPage(page, row);
                const date = page.version.when;
                const title = page.title;
                const external_id = page.id;

                const file = await helpers.getFile(external_id);
                if (file == undefined) {
                  await db.runAsync("INSERT INTO files (external_id,folder_id,name,content,lastModified) VALUES (?,?,?,?,?)", external_id, row.id, title, markdown, date);
                  ws.send(JSON.stringify({ action: 'file', folderid: row.id, external_id: external_id, 'name': title, index: ((i) * perPage + y + 1), totalSize: totalSize }));

                } else {

                  var updated = false;
                  if (new Date(file.lastModified) < new Date(date)) {
                 
                    await db.runAsync("UPDATE files SET name=?,content=?,lastModified=?,validated=0 WHERE external_id = ? ", title, markdown, date, external_id);
                    updated = true;
                  }
                  
                                      ws.send(JSON.stringify({ action: 'update',updated, folderid: row.id, external_id: external_id, 'name': title, index: ((i) * perPage + y + 1), totalSize: totalSize ,dblastUpdated : new Date(file.lastModified),  lastUpdated: new Date(date)}));

                }



              }
            }


            ws.send(JSON.stringify({ action: 'end' }));

          });
        })
        .catch((err) => {
          res.status(500).send("Error")
        });
    } else if (json.action == "export") {

      helpers.getExportFiles().then(async (files) => {

        const totalSize = files.length;
        for (let i = 0; i < totalSize; i++) {
          const pdf = await mdToPdf({ content: files[i].content }, { dest: `./export/${sanitize(files[i].name)}.pdf` });
          ws.send(JSON.stringify({ action: 'export', index: i + 1, totalSize: totalSize }));
        }
        ws.send(JSON.stringify({ action: 'end' }));
      });

    }
  });

  // Send a welcome message to the client
});






server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
