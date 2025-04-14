if (document.querySelector("input.search")) {
  document
    .querySelector("input.search")
    .addEventListener("input", function (e) {
      const this_input = this;
      this_input.parentElement.parentElement
        .querySelectorAll(".menu-list .item")
        .forEach((item) => {
          if (
            this_input.value == "" ||
            item
              .getAttribute("data-name")
              .toLowerCase()
              .includes(this_input.value.toLowerCase())
          ) {
            item.style.display = "flex";
          } else {
            item.style.display = "none";
          }
        });
    });
}

function folder(row = {}) {
  let buttons = [
    {
      text: "Cancel",
      action: function () {
        return;
      },
    },
    {
      text: (row.id ? "Modify" : "Add") + " folder",
      btnClass: "btn-blue",
      keys: ["enter", "shift"],
      action: function () {
        var jc = this;
        let params = {};
        let error = false;
        this.$content.find("input,textarea").each((k, v) => {
          console.log(v.getAttribute("required"))
          if(v.getAttribute("required") && v.value == ""){
            v.classList.add("error")
            error=true;
          }else{
            v.classList.remove("error")
          }
          params[v.name] = v.value;
        });
        if(!error){
          $.post(`/api/update/folder`,params, function (data) {
            if(data.success){
              if(data.id){
                window.location = '/folder/'+data.id;
              }
            }else{
              alert("An error occured");
            }
          });
         
          return true;
        }else{
          return false;
        }
      },
    },
  ];

  if (row.id) {
    buttons.splice(1, 0, {
      text: "Remove folder",
      btnClass: "btn-red",
      action: function () {
        $.post(`/api/delete/folder/${row.id}`, function () {
          window.location = "/";
        });
      },
    });
  }

  $.confirm({
    useBootstrap: false,
    boxWidth: "500px",
    theme: "light",
    closeIcon: true,
    closeIconClass: "ph ph-x",
    title: (row.id ? "Modify" : "Add") + " a folder 📁",
    content: `
      <div class="input-block">
      <input type="hidden" name="id" value="${row.id || ""}">
      <label>Name</label>
      <input type="text" name="name" value="${row.name || ""}" required="true">
      </div>
      <div class="input-block">
      <label>Ancestor ID</label>
      <input type="text" name="ancestor_id" ${
        row.ancestor_id ? "disabled" : ""
      } value="${row.ancestor_id || ""}" required="true">
      </div>
      <div class="input-block">
       <label>Confluence page title includes</label>
      <input type="text" name="title_include"  value="${
        row.title_include || ""
      }">
      </div>
      <div class="input-block">
       <label>Page updated after</label>
      <input type="date" name="updated_after" value="${
        row.updated_after || ""
      }">
      </div>
       <div class="input-block">
      <label>Prepend to files</label>
      <textarea name="prepend">${row.prepend || ""}</textarea>
      </div>
      `,
    buttons: buttons,
  });
}

$(
  (function () {
    $("#add-folder").on("click", function () {
      folder();
    });

    $(".edit").on("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const id = $(this).attr("data-id");
      $.get(`/api/folder/${id}`, function (f) {
        folder(f);
      });
    });
  })()
);
