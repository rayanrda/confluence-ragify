const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const  {tabletojson} = require('tabletojson');
// var TurndownService = require('turndown')
// var TurndownPluginGfm = require('@guyplusplus/turndown-plugin-gfm')
// var turndownService = new TurndownService()
// TurndownPluginGfm.gfm(turndownService)


var TurndownService = require('turndown')
var turndownPluginGfm = require('@joplin/turndown-plugin-gfm')

var gfm = turndownPluginGfm.gfm
var turndownService = new TurndownService({codeBlockStyle:"fenced",fence:"`"})
turndownService.use(gfm)


class ConfluenceExport {



    async fetchPages(config, start,limit){

        if(!process.env.CONFLUENCE_TOKEN || process.env.CONFLUENCE_TOKEN == ''){
            throw new Error("Update you token in the .env file");
            return;
        }

        const response = await fetch(this.build_query(config, start, limit),
           {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.CONFLUENCE_TOKEN}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
              
            },
          });
      
        const json = await response.json();
        return json;
    }   
    
     build_query(config,start,limit){

        let url = `${process.env.CONFLUENCE_BASE}/rest/api/content/search?cql=`;
    
        let params = [];
  
        if(config.space == ''){
            throw new Error("You much specify a space for each folder");
            return;
        }
        if(config.ancestor_id == ''){
            throw new Error("You much specify an ancestor for each folder");
            return;
        }
        params.push(`ancestor+=+"${config.ancestor_id}"`);
        params.push(`space+=+"${config.space}"`);
        params.push(`type+=+"page"`);

        if(config.space && config.title_include !== ''){
            params.push(`title+~+"${config.title_include}"`);
        }
        if(config.updated_after && config.updated_after !== ''){
          params.push(`lastmodified+>=+"${config.updated_after}"`);
      }

        url += encodeURIComponent(params.join("+and+"));

        url +=`&expand=body.export_view,body.view,version&limit=${limit}&start=${start}`;


       return url;
    }

    markdown(html){

        html = html.replace(/\/\*<!\[CDATA\[\*\/[\s\S]*?\/\*\]\]>\*\//g, "");
        html = html.replace(/[\r\n]+/gm, "");
        html = html.replace(/\@\</gm, "<");
        
        html = html.replaceAll("Expand source", "");
        
        const dom = new JSDOM(html);


        dom.window.document.querySelectorAll("img").forEach(img => {img.remove();});

        dom.window.document.querySelectorAll(".code").forEach(h => {
          h.innerHTML = "<code>"+h.textContent+"</code>"; 
        });
        dom.window.document.querySelectorAll("table h1,table h2,table h3,table h4,table h5").forEach(h => {
          h.outerHTML = "<strong>"+(h.textContent)+"</strong>"; 
        });
        dom.window.document.querySelectorAll(".confluence-information-macro-information").forEach(v => {v.remove();});

       
        dom.window.document.querySelectorAll(".syntaxhighlighter ").forEach(v => {
          v.outerHTML = "<code>"+v.textContent+"</code>"; 
        });
        dom.window.document.querySelectorAll("pre").forEach(v => {
          v.outerHTML = "<code>"+v.textContent+"</code>"; 
        });
        dom.window.document.querySelectorAll(".plugin-tabmeta-details").forEach(v => {v.remove();});



        dom.window.document.querySelectorAll("table").forEach(table => {

          table.querySelectorAll("table").forEach(subtable => { 
            let subtable_html = "<blockquote></br>";
            let converted_subtable = tabletojson.convert(subtable.outerHTML);
            if(converted_subtable[0] == undefined){
              return;
            }
            
            converted_subtable[0].forEach((row,krow) => {
              Object.keys(row).forEach(function(key) {
                subtable_html += `<strong>${key}:</strong> ${row[key]}</br>`;
              });
              subtable_html += "</br>";
            });
            subtable_html += "</blockquote>";
            subtable.outerHTML = subtable_html;
          });
        
        

          let converted_table = tabletojson.convert(table.outerHTML,{stripHtmlFromCells:false});
          let table_html = "";
          if(converted_table[0] == undefined){
            return;
          }
          
          converted_table[0].forEach((row,krow) => {
            table_html += "<hr>";
            Object.keys(row).forEach(function(key) {
              table_html += `<strong>${key}:</strong> ${row[key]}</br>`;
            });
          });
          table_html += "<hr>";
          table.outerHTML = table_html;
        });
        
        const markdown = turndownService.turndown(dom.window.document.documentElement.innerHTML)
        return markdown;
    }

}

module.exports = new ConfluenceExport();