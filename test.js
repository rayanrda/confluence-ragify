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

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

 
 
 helpers.getFile("372019644").then(async (file) => {
              const pdf = await mdToPdf({ content: file.content },{ dest: `./export/${sanitize(file.name)}.pdf` });
        
});