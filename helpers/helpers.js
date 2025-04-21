const db = require("./db.js");

class AppFunction {
  getFolders() {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT folders.*, COUNT(files.external_id) as nb_files FROM folders LEFT JOIN files ON files.folder_id = folders.id GROUP BY folders.id",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getFolder(folderid) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM folders WHERE id = ?",
        [folderid],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }


  getFile(external_id) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM files WHERE external_id = ?",
        [external_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
  
  getFiles(folderid) {
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

  getExportFiles(folderid) {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM files WHERE exclude = 0 AND validated = 1",
        [folderid],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async render(res, folder = null, file = null) {
    
    try {
      const folders = await this.getFolders();
      let files = [];
      let activeFile = null;
      let content = null;

      if (folder !== null) {
        const folderIndex = folders.findIndex((v) => v.id === parseInt(folder));
        if (folderIndex !== -1) {
          folders[folderIndex].active = true;
        } else {
          res.status(404).send("Folder Not Found");
          return;
        }

        files = await this.getFiles(folder);
      
        if (file !== null) {
          const fileIndex = files.findIndex((v) => { return parseInt(v.external_id) === parseInt(file);});
          if (fileIndex !== -1) {
            files[fileIndex].active = true;
            content = files[fileIndex].content;
            activeFile = files[fileIndex];
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
        activeFile:activeFile,
        content:content!==null?content:'' ,
        message: "Hello from Handlebars!",
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching data from the database.");
    }
  }
}

module.exports = new AppFunction();