



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
      keys: [],
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
      <label>Confluence Space</label>
      <input type="text" name="space" ${
        row.space ? "disabled" : ""
      } value="${row.space || ""}" required="true">
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

var socket = new WebSocket('ws://localhost:3000');

socket.onopen = function() {
    console.log('WebSocket connection established.');
};

socket.onmessage = function(event) {
  const json = JSON.parse(event.data);
  if(json.action == "init"){
    $(".progress").show();
  }else if(json.action == "file"){
    $(".progress .bar").css("width",`${Math.round(parseInt(json.index)/parseInt(json.totalSize)*100)}%`);
    $(".aside-files .menu-list").append(`<a href="/folder/${json.folderid}}/file/${json.external_id}" class="item" data-name="${json.name}"><i
          class="ph ph-file"></i>${json.name}</a>`)
          if(parseInt($(".item.active .count").text()) < parseInt(json.index)){
            $(".item.active .count").text(json.index);
            }
  }else if(json.action == "update"){
    $(".progress .bar").css("width",`${Math.round(parseInt(json.index)/parseInt(json.totalSize)*100)}%`);
    if(parseInt($(".item.active .count").text()) < parseInt(json.index)){
    $(".item.active .count").text(json.index);
    }
  }else if(json.action == "error"){
    $(".progress .bar").css("width",`${Math.round(parseInt(json.index)/parseInt(json.totalSize)*100)}%`);
  }else if(json.action == "end"){
    $(".progress").hide();
    window.location.reload();
  }else if(json.action == "export"){

    $(".progress .bar").css("width",`${Math.round(parseInt(json.index)/parseInt(json.totalSize)*100)}%`);
  }


};

socket.onclose = function() {
    console.log('WebSocket connection closed.');
    window.location.reload();
};

socket.onerror = function(error) {
    console.error('WebSocket error:', error);
};


function update_files(id){
  socket.send(JSON.stringify({action:'update-file',folderid:id}));
}


function export_files(){
  $(".progress").show();
   socket.send(JSON.stringify({action:'export'}));
}
function detectSensitiveInfo(inputString) {
  // Define patterns for sensitive information
  const patterns = [
      /\b(token|password|secret|key|auth|api_key|access_token|bearer)\b/gi, // Keywords (global and case-insensitive)
      /(?:password|token|key|secret)[\s=:]*['"]?[a-zA-Z0-9!@#$%^&*()_+\-={}[\]|:;"'<>,.?/]{8,}/gi, // Sensitive data assignment
      /[a-zA-Z0-9]{32,}/g, // Long alphanumeric strings (e.g., API tokens)
      /(?=.*[A-Z])(?=.*[0-9])(?=.*[a-z])[A-Za-z0-9!@#$%^&*()_+\-={}[\]|:;"'<>,.?/]{12,}/g // Complex patterns (e.g., passwords)
  ];

  // Define a pattern to detect URLs
  const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s]*)?/gi;

  // Collect all matches for sensitive information
  let matches = [];
  patterns.forEach(pattern => {
      const foundMatches = inputString.match(pattern);
      if (foundMatches) {
          matches = matches.concat(foundMatches); // Add all matches to the array
      }
  });

  // Filter out matches that look like URLs
  const filteredMatches = matches.filter(match => !urlPattern.test(match));

  // Return the result
  if (filteredMatches.length > 0) {
      return {
          containsSensitiveInfo: true,
          matches: filteredMatches
      };
  } else {
      return {
          containsSensitiveInfo: false,
          matches: []
      };
  }
}

function notif(msg,status="success"){
  let notification = $("<div>",{class:"notification"});
  notification.text(msg);
  notification.addClass(status);
  $("body").append(notification);
  setTimeout(() => {notification.remove();},2000);
  }

$(() => {

  if(document.querySelector("input.search") && document.querySelector("select.file-status")){
  document.querySelector("input.search").value = window.localStorage.getItem("search") || "";
  document.querySelector("select.file-status").value = window.localStorage.getItem("filter") || "all";
  }

  filter();
  if (document.querySelector("input.search")) {
    document.querySelector("input.search").addEventListener("input", function (e) {filter(this.value,null)});
  }
   
  if (document.querySelector("select.file-status")) {
    document.querySelector("select.file-status").addEventListener("change", function (e) {filter(null,this.value)});
  }


    $(".edit").on("click", function (e) {

      e.preventDefault();
      e.stopPropagation();
      const id = $(this).attr("data-id");
      $.get(`/api/folder/${id}`, function (f) {
        folder(f);
      });
    });

    $("#add-folder").on("click", function () {
      folder();
    });

    $("#update-file").on("click", function () {
      const id = $(this).attr("data-id");
      update_files(id);
    });

    $("#export-files").on("click", function () {
      export_files();
    });

    
  
  });



  

  function filter(search_value=null,status_value=null){
    search_value = search_value !== null ? search_value : window.localStorage.getItem("search");
    status_value = status_value !== null ? status_value : window.localStorage.getItem("filter");

    document.querySelectorAll(".aside-files .menu-list .item")
    .forEach((item) => {
      display = true;
      if (search_value !== "" && !item.getAttribute("data-name").toLowerCase().includes(search_value.toLowerCase())) {
        display = false;
      }

      if (status_value == "validated" && (!item.classList.contains("validated") || item.classList.contains("strikethrough"))) {
        display = false;
      }else if (status_value == "excluded" && !item.classList.contains("strikethrough")) {
        display = false;
      }else if (status_value == "to_validate" && (item.classList.contains("validated") || item.classList.contains("strikethrough"))) {
        display = false;
      }

      if(display){
        item.style.display = "flex";
      }else{
        item.style.display = "none";
      }


    });

    window.localStorage.setItem("filter",status_value );
    window.localStorage.setItem("search",search_value);

  }
