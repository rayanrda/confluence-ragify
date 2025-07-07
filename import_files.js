const db = require("./helpers/db.js");

const files = require("./files.json");



(async () => {

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const db_file = await getFileByName(file.file_name.replace(".pdf",""));
        if(db_file !== undefined){
        await updateOAGPTID(db_file.external_id,file.file_id);
        }
    }

})();



function getFileByName(name) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM files WHERE REPLACE(REPLACE(TRIM(REPLACE(REPLACE(name,'/',''),'\"',''),'.'),':',''),'?','') = ?",
        [name],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  function updateOAGPTID(id,oa) {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE files SET oa_gpt_id=? WHERE external_id = ? ",
        [oa,id],
        (err) => {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
  }