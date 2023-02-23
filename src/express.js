const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const multer  =   require('multer');
const fs = require('fs');
const app = express();
const CsvReadableStream = require('csv-reader');
const getUuid = require('uuid-by-string');
const csv2json = require('csvtojson');

process.on('uncaughtException', (error)  => {
   
  console.log('Oh my god, something terrible happened: ',  error);

  // process.exit(1); // exit application 

})


!fs.existsSync("uploads") && fs.mkdirSync("uploads");
!fs.existsSync("download") && fs.mkdirSync("download");

const storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads');
  },
  filename: function (req, file, callback) {
    // callback(null, file.originalname);
    callback(null, "import.csv");
  }
});

const memoryStorage = multer.memoryStorage();

var upload = multer({ storage : storage}).single('csv');

app.post('/api/csv', function(req,res) {
  console.log("req", req.file);
  upload(req,res,function(err) {
    const resp = {
      error: null,
      download: null
    }
      if(err) {
        console.error(err);
        resp.error = "Error uploading file.";
        return res.json(resp);
      }
      console.log("file", req.file); 
      csv2json().fromFile("./uploads/import.csv").then(data => {
        console.log(data);
        let newData = [];
        if (data instanceof Array) {
          data.forEach(row => {
            if(!isValidRow(row)) {
              resp.error = `There are validation errors on the CSV for item ${JSON.stringify(row)}`;
              res.json(resp);
            }
            newData.push(processRawData(row));
          });

          if(newData.length == 0) {
            resp.error = "Bad file format"; 
            res.json(resp);
            return;
          }
          const filename = `quotePermission-${Date.now()}.json`;
          fs.writeFileSync(`download/${filename}`, JSON.stringify(newData));
          resp.download = `<a href='api/quotePermission/${filename}'> Download </a>`;
          res.json(resp);

        } else {
          resp.error = "Not a CSV file as per expectations";
          res.json(resp);
        }
      });
  });
});

const processRawData = (row) => {
  return newData = {
    branchId: row.branchId,
    loginId: getLoginId(row),
    sessionPermissions: row.sessionPermission? [row.sessionPermission] : [],
    dealerCode: row.dealerCode,
    platformBranchId: row.platformBranchId,
    dealerBranchId: row.dealerBranchId,
    id: getUuid(row.branchId + row.dealerCode + row.platformBranchId + row.dealerBranchId + getLoginId(row)),
    assetClass: row.assetClass ? row.assetClass : "FixedIncome",
    relationship: row.relationship ? row.relationship : "Relationship:Bilateral",
    account: []
  }
}

const getLoginId = (row) => {
  return row.loginId? row.loginId: null
}

const isValidRow = (row) => {
  if(row.branchId && row.dealerCode && row.platformBranchId && row.dealerBranchId) {
    return true;
  } else {
    return false;
  }
}

app.get('/api/quotePermission/:id',function(req,res){
  console.log("/api/quotePermission/" + req.params.id);
  res.download(`download/${req.params.id}`);
});

app.use(function (err, req, res, next) {
  res.status(500);
  console.log(err);
  res.send("Oops, something went wrong.")
});




app.use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

module.exports = app;