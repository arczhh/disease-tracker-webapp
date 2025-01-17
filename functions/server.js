const express = require('express');
const firebase = require("firebase-admin");
const bcrypt = require('bcryptjs');
const port = process.env.PORT || 3000;
const session = require('express-session');
const bodyParser = require('body-parser');
const moment = require('moment');
const formidable = require('formidable');
const neatCsv = require('neat-csv');
const fs = require('fs-extra');
const d = new Date();
const app = express();
const serviceAccount = require("./disease-tracker-91b76-firebase-adminsdk-mfz8y-f52e76a570.json");
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://disease-tracker-91b76.firebaseio.com/"
});
app.set('view engine','ejs')
app.use(express.static('views'));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use((req, res, next)=>{
    moment.locale('th')
    res.locals.moment = moment;
    next();
});

// Extention Variables
let path = undefined;

/*
        Fetch Function
*/
function adminData(callback){
  firebase.firestore().collection("admin").get()
  .then(function(querySnapshot) {
    return callback(querySnapshot);
  })
}

function hospitalData(callback){
  firebase.firestore().collection("hospital").get()
  .then(function(querySnapshot) {
    return callback(querySnapshot);
  })
}

function hospitalDataByID(id, callback){
  firebase.firestore().collection(`hospital`).doc(`${id}`).get()
  .then(snapshot => {
    return callback(snapshot.data());
  })
}

function diseaseData(callback){
  firebase.firestore().collection("disease").get()
  .then(function(querySnapshot) {
    return callback(querySnapshot);
  })
}

function reponsibleDiseaseByHospitalID(id,callback){
  firebase.firestore().collection(`hospital/${id}/responsible`).get()
  .then(snapshot => {
    return callback(snapshot)
  })
}

function provinceData(callback){
  firebase.firestore().collection(`province`).get()
  .then(snapshot => {
    return callback(snapshot)
  })
}

function userData(callback){
  firebase.firestore().collection(`user`).get()
  .then(snapshot => {
    return callback(snapshot)
  })
}

function patientStatusData(callback){
  firebase.firestore().collection("patientStatus").get()
  .then(function(querySnapshot) {
    return callback(querySnapshot);
  })
}

function patientData(callback){
  firebase.firestore().collection("patient").get()
  .then(function(querySnapshot) {
    return callback(querySnapshot);
  })
}

function patientDataByID(id,callback){
  firebase.firestore().collection("patient").doc(`${id}`).get()
  .then(function(querySnapshot) {
      return callback(querySnapshot);
  })
}

function patientLocationDataByID(id,callback){
  firebase.firestore().collection(`patient/${id}/location`).orderBy("timestamp").get()
  .then(function(querySnapshot) {
    return callback(querySnapshot);
  });
}

/*
      Redirect Function with alert
*/
function hospitalPageID(id,alert,req,res){
  if (req.session.loggedin && req.session.role == "Admin") {
    diseaseData(function(disease){           
      hospitalDataByID(id,function(hospital){           
        reponsibleDiseaseByHospitalID(id,function(responsibles){           
          res.render("admin_menu/hospitalresp.ejs",{ 
            email: req.session.email, 
            role: req.session.role, 
            diseaseRes: responsibles, 
            disease: disease, 
            hospitalID: id, 
            hospitalName: hospital["hospitalName"],
            alert: alert })
        });
      });
    });
  }
}

function patientListPage(alert,req,res){
  if (req.session.loggedin && req.session.role == "Admin") {
      patientData(function(patient){
          diseaseData(function(disease){
              patientStatusData(function(patStat){
                  res.render("menu/patientList.ejs",{ email: req.session.email, role: req.session.role, patient: patient, disease: disease, patStat: patStat, alert: alert})
              })
          })
      })
} else {
  res.redirect('/');
}
}

function patientPage(id,alert,filedata,uploadCheck,filetype,req,res){
  if (req.session.loggedin && (req.session.role == "Admin" || req.session.role == "Staff")) {
      patientLocationDataByID(id,function(patLoc){           
          patientDataByID(id,function(patient){
              res.render("menu/patient.ejs",{ 
                  email: req.session.email, role: req.session.role, 
                  patLoc: patLoc, patient: patient, alert: alert,
                  data: filedata, upload: uploadCheck, filetype: filetype
              })
          })
      });
  } else {
    res.redirect('/');
  }
}

function alert(alert,msg,link,req,res){
  if (req.session.loggedin && (req.session.role == "Admin" || req.session.role == "Staff")) {
      res.render("alert.ejs",{ email: req.session.email, role: req.session.role, alert: alert, msg: msg, link: link})
} else {
  res.redirect('/');
}
}

/*
      Add Function
*/
function addHospital(name,lat,lng,req,res){
  if (req.session.loggedin && req.session.role == "Admin") {
    firebase.firestore().collection("hospital").get()
    .then(snapshot => {
      firebase.firestore().collection("hospital").doc(`${snapshot.size}`).set({
        hospitalName: name,
        lat: Number(lat),
        lng: Number(lng)
      });
      alert("success","เพิ่มโรงพยาบาลสำเร็จ","/hospital",req,res)
    })
  }else{
    res.redirect('/hospital')
  }	
}

function addHospitalResponsible(id,disease,req,res){
  if (req.session.loggedin && req.session.role == "Admin") {
    firebase.firestore().collection(`hospital/${id}/responsible`).get()
    .then(snapshot => {
      firebase.firestore().collection(`hospital/${id}/responsible`).doc(`${snapshot.size}`).set({
        diseaseName: disease[2],
      });
      alert("success","เพิ่มโรคที่รับผิดชอบสำเร็จ","/hospital"+id,req,res)
    })
  }
}

function addDisease(name,req,res){
  if (req.session.loggedin && req.session.role == "Admin") {
    firebase.firestore().collection("disease").get()
    .then(snapshot => {
      firebase.firestore().collection("disease").doc(`${snapshot.size}`).set({
        diseaseName: name,
      });
      alert("success","เพิ่มโรคสำเร็จ","/disease",req,res)
    })
  }
}

function addProvince(name,lat,lng,req,res){
  if (req.session.loggedin && req.session.role == "Admin") {
    firebase.firestore().collection("province").get()
    .then(snapshot => {
      firebase.firestore().collection("province").doc(`${snapshot.size}`).set({
        provinceName: name,
        lat: Number(lat),
        lng: Number(lng)
      });
      alert("success","เพิ่มจังหวัดสำเร็จ","/province",req,res)
    })
  }
}

function addPatStat(name,req,res){
  if (req.session.loggedin && req.session.role == "Admin") {
    firebase.firestore().collection("patientStatus").get()
    .then(snapshot => {
      firebase.firestore().collection("patientStatus").doc(`${snapshot.size}`).set({
        statusName: name,
      });
      alert("success","เพิ่มสถานะผู้ป่วยสำเร็จ","/patStat",req,res)
    })
  }
}

function addPatient(name,disease,patStat,username,req,res){
  firebase.firestore().collection("patient").get()
  .then(snapshot => {
    firebase.firestore().collection("patient").add({
      username: username,
      patientName: name,
      patientDisease: disease,
      patientStatus: patStat
    });
    alert("success","ลงทะเบียนสำเร็จผู้ป่วยสำเร็จ","/patientList",req,res)
  })
}

function addPatientLocation(id,lat,lng,desc,timestamp,req,res){ 
  var asiaTime = new Date(`${timestamp.split(" ")[0]}T${timestamp.split(" ")[1]}`).toLocaleString("en-US", {timeZone: "Asia/Bangkok"});
  if (req.session.loggedin && req.session.role == "Admin") {
    firebase.firestore().collection(`patient/${id}/location`).get()
    .then(snapshot => {
      firebase.firestore().collection(`patient/${id}/location`).add({
        lat: Number(lat), 
        lng: Number(lng),
        timestamp: timestamp,
        unixTimestamp: new Date(asiaTime).getTime(),
        desc: desc
      });
      alert("success","เพิ่มตำแหน่งผู้ป่วยสำเร็จ","/patient"+id,req,res)
    })
  }
}

/*
      Edit Function
*/
function editHospital(id,name,lat,lng,req,res){
    if (req.session.loggedin && req.session.role == "Admin") {
      firebase.firestore().collection("hospital").doc(id).update({
        hospitalName: name,
        lat: lat,
        lng: lng
      });
      alert("success","บันทึกการแก้ไขการเปลี่ยนแปลงโรงพยาบาลสำเร็จ","/hospital",req,res)
    }else{
      res.redirect('/hospital')
  }	
}

function editDisease(id,newName,oldName,req,res){
  if (req.session.loggedin && req.session.role == "Admin") {
    firebase.firestore().collection("disease").doc(`${id}`).update({
      diseaseName: newName
    });
    firebase.firestore().collection(`hospital`).get()
    .then(snapshot => {
      snapshot.forEach(function(hospital) {
        firebase.firestore().collection(`hospital/${hospital.id}/responsible`).where("diseaseName","==",`${oldName}`).get()
        .then(snap => {
          snap.forEach(function(responsible) {
            firebase.firestore().collection(`hospital/${hospital.id}/responsible`).doc(`${responsible.id}`).update({
              diseaseName: `${newName}`
            });
          });
        })
      });
    })
    alert("success","บันทึกการแก้ไขการเปลี่ยนแปลงโรคสำเร็จ","/disease",req,res)
  }
}

function editProvince(id,name,lat,lng,req,res){
  if (req.session.loggedin && req.session.role == "Admin") {
    firebase.firestore().collection("province").doc(`${id}`).update({
      provinceName: name,
      lat: Number(lat),
      lng: Number(lng)
    });
    alert("success","บันทึกการแก้ไขการเปลี่ยนแปลงจังหวัดสำเร็จ","/province",req,res)
  }
}

function editPatStat(patStatName,patStatNameNew,patStatID,req,res){
  if (req.session.loggedin && req.session.role == "Admin") {
    firebase.firestore().collection("patientStatus").doc(`${patStatID}`).update({
      statusName: patStatNameNew
    });
    firebase.firestore().collection(`patient`).get()
    .then(snapshot => {
      snapshot.forEach(function(patient) {
        firebase.firestore().collection(`patient`).where("statusName","==",`${patStatName}`).get()
        .then(snap => {
          snap.forEach(function(e) {
            firebase.firestore().collection(`patient`).doc(`${e.id}`).update({
              diseaseName: `${patStatNameNew}`
            });
          });
        })
      });
    })
    alert("success","บันทึกการแก้ไขการเปลี่ยนแปลงสถานะของผู้ป่วยสำเร็จ","/patStat",req,res)
  }
}

function editPatient(id,name,disease,patStat,req,res){
  if (req.session.loggedin && req.session.role == "Admin") {
    firebase.firestore().collection("patient").doc(`${id}`).update({
      patientName: name,
      patientDisease: disease,
      patientStatus: patStat
    });
    alert("success","แก้ไขการเปลี่ยนแปลงผู้ป่วยสำเร็จ","/patientList",req,res)
  }
}

function editPatientLocation(id,lid,lat,lng,timestamp,desc,req,res){
  var asiaTime = new Date(`${timestamp.split(" ")[0]}T${timestamp.split(" ")[1]}`).toLocaleString("en-US", {timeZone: "Asia/Bangkok"});
  if (req.session.loggedin && req.session.role == "Admin") {
    firebase.firestore().collection(`patient/${id}/location`).doc(`${lid}`).update({
      lat: Number(lat),
      lng: Number(lng),
      timestamp: timestamp,
      unixTimestamp: new Date(asiaTime).getTime(),
      desc: desc
    });
    alert("success","บันทึกการแก้ไขการเปลี่ยนแปลงตำแหน่งของผู้ป่วยสำเร็จ","/patient"+id,req,res)
  }
}

// Login
app.get('/', function(req, res) {
  if (req.session.loggedin) {
      res.redirect('/dashboard');
  } else {
    res.render('login.ejs',{ alert: ""});
  }
});

app.post('/', function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  if (email && password) {
    firebase.firestore().collection("admin").where("email","==",email).get()
      .then(snapshot => {
        if (snapshot.empty) {
          res.render('login.ejs',{ alert: "อีเมล ไม่ถูกต้อง" });
        }
        snapshot.forEach(doc => {
        if(bcrypt.compareSync(password+doc.data()["salt"], doc.data()["password"])) {
            // Passwords match
            req.session.loggedin = true;
            req.session.email = doc.data()["email"];
            req.session.role = doc.data()["role"];
            console.log("User: "+req.session.email+", logged in time: "+d.toGMTString())
            if(doc.data()["status"] != "Activated"){
                res.render('login.ejs',{ alert: "บัญชีของคุณถูกปิดการใช้งาน" });
            }else{
                res.redirect('/dashboard');
            }
        } else {
            // Passwords don't match
            res.render('login.ejs',{ alert: "รหัสผ่าน ไม่ถูกต้อง" });
        }    
      });
    })
  } else {
    res.render('login.ejs',{ alert: "กรุณากรอก อีเมลและรหัสผ่าน" });
    res.end();
  }
});

// Dashboard
app.get('/dashboard', (req,res) => {
  if (req.session.loggedin && req.session.role == "Admin") {
      adminData(function(data){           
          // code to execute on data retrieval
          res.render("index.ejs",{ email: req.session.email, role: req.session.role, adminData: data})
      });
  } else {
    res.redirect('/');
  }
})

// Disease
app.get('/disease', (req,res) => {
  if (req.session.loggedin && req.session.role == "Admin") {
      diseaseData(function(disease){
          res.render("admin_menu/disease.ejs",{ email: req.session.email, role: req.session.role, disease: disease, alert: ""})
      })
} else {
  res.redirect('/');
}
})

app.post('/addDisease', function(req, res) {
  var inputDiseaseName = req.body.inputDiseaseName;
  addDisease(inputDiseaseName,req,res);
});

app.post('/editDisease', (req,res) => {
  var newName = req.body.inputDiseaseNameEdit;
  var oldName = req.body.diseaseName;
  var id = req.body.inputDiseaseID;
  editDisease(id,newName,oldName,req,res);
})

// Hospital
app.get('/hospital', (req,res) => {
  if (req.session.loggedin && req.session.role == "Admin") {
    hospitalData(function(data){           
      res.render("admin_menu/hospital.ejs",{ email: req.session.email, role: req.session.role, hospital: data, alert: "" })
    });
  } else {
    res.redirect('/');
  }
})

app.post('/hospital', function(req, res) {
  var inputNameAdd = req.body.inputNameAdd;
  var inputLatAdd = req.body.inputLatAdd;
  var inputLngAdd = req.body.inputLngAdd;
  addHospital(inputNameAdd,inputLatAdd,inputLngAdd,req,res)
});

app.post('/edithospital', function(req, res) {
  var id = req.body.hospitalID;
  var name = req.body.hospitalName;
  var lat = req.body.hospitalLat;
  var lng = req.body.hospitalLng;
  editHospital(id,name,lat,lng,req,res);
});

app.get('/hospital:id', (req,res) => {
  var id = req.params.id;
  hospitalPageID(id,"",req,res)
})

app.post('/hospital:id', function(req, res) {
  var inputHospitalID = req.body.inputHospitalID;
  var diseaseSelector = req.body.diseaseSelector;
  var arrOfStr = diseaseSelector.split(" "); 
  addHospitalResponsible(inputHospitalID,arrOfStr,req,res);
});

// Province
app.get('/province', (req,res) => {
  if (req.session.loggedin && req.session.role == "Admin") {
    provinceData(function(data){           
      res.render("admin_menu/province.ejs",{ email: req.session.email, role: req.session.role, province: data, alert: "" })
    });
  } else {
    res.redirect('/');
  }
})

app.post('/province', function(req, res) {
  var inputNameAdd = req.body.inputNameAdd;
  var inputLatAdd = req.body.inputLatAdd;
  var inputLngAdd = req.body.inputLngAdd;
  if (inputNameAdd != "" && inputLatAdd != "" && inputLngAdd != "") {
        addProvince(inputNameAdd,inputLatAdd,inputLngAdd,req,res)
  }else{
    res.redirect('/province')
  }	
});

app.post('/editprovince', function(req, res) {
  var id = req.body.provinceID;
  var name = req.body.provinceName;
  var lat = req.body.lat;
  var lng = req.body.lng;
  editProvince(id,name,lat,lng,req,res);
});

// Patient status
app.get('/patStat', (req,res) => {
  if (req.session.loggedin && req.session.role == "Admin") {
      patientStatusData(function(patStat){
          res.render("admin_menu/patStat.ejs",{ email: req.session.email, role: req.session.role, patStat: patStat, alert: ""})
      })
} else {
  res.redirect('/');
}
})

app.post('/patStat', function(req, res) {
  var statName = req.body.statName;
  addPatStat(statName,req,res);
});

app.post('/editPatStat', (req,res) => {
  var patStatName = req.body.patStatName;
  var patStatNameNew = req.body.patStatNameNew;
  var patStatID = req.body.patStatID;
  editPatStat(patStatName,patStatNameNew,patStatID,req,res)
})

// Patient
app.get('/addPatient', (req,res) => {
  if (req.session.loggedin && (req.session.role == "Admin" || req.session.role == "Staff")) {
      userData(function(user){
          patientStatusData(function(patStat){
              diseaseData(function(disease){
                  res.render("menu/addPatient.ejs",{ email: req.session.email, role: req.session.role, 
                      user: user, patStat: patStat, disease: disease,
                      alert:""})
              })
          })
      })
} else {
  res.redirect('/');
}
})

app.post('/addPatient', function(req, res) {
  var inputName = req.body.inputName;
  var disease = req.body.disease;
  var patStat = req.body.patStat;
  var username = req.body.username;
  addPatient(inputName,disease,patStat,username,req,res);
});

app.get('/patientList', (req,res) => {
  patientListPage("",req,res)
})

app.post('/patientList', function(req, res) {
  var id = req.body.patientID;
  var name = req.body.patientName;
  var disease = req.body.diseaseNowID;
  var patStat = req.body.patStatNew;
  editPatient(id,name,disease,patStat,req,res);
});

app.get('/patient:id', function(req, res) {
  var id = req.params.id;
  patientPage(id,"","","false","",req,res)
});

app.get('/patlocadd', (req,res) => {
  console.log(global.path)
  fs.readFile(global.path, async (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    var dat = await neatCsv(data, { headers: false });
    var patientID = `${parseInt(dat[0][0])}`;
    firebase.firestore().collection(`patient/${patientID}/location`).get()
      .then(snapshot => {
        var id = snapshot.size
        dat.forEach(function (value) {
          firebase.firestore().collection(`patient/${patientID}/location`).doc(`${id}`).set({
            lat: Number(value['2']), 
            lng: Number(value['3']),
            timestamp: value['4'],
            desc: value['5']
          });
          id++;
      })
    });
    alert("success", "เพิ่มตำแหน่งจากไฟล์สำเร็จแล้ว","/patient"+patientID,req,res)
  });
});

app.post('/patientloc:id', function(req, res) {
  var id = req.params.id
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
      global.path = files.filetoupload.path;
      //global.path = 'C:\\Users\\arczhh\\AppData\\Local\\Temp\\data.csv';
      var name = files.filetoupload.name.split(".")
      //fs.copyFileSync(global.oldpath, global.path);
      fs.readFile(global.path, async (err, data) => {
      if (err) {
          console.error(err)
          return
      }
      var dat = await neatCsv(data, { headers: false });
      var isIDEquals
      var alert = ""
      for(var i=0; i<dat.length; i++){
          isIDEquals = parseInt(`${dat[i][0]}`) == parseInt(`${id}`)
          if(!isIDEquals) break;
      }
      if(!isIDEquals){
          alert = "notEquals"
      }
      patientPage(id,alert,dat,"true",name[1],req,res)
      })
  });
});

app.post('/patient:id', function(req, res) {
  var id = req.params.id;
  var lat = req.body.lat;
  var lng = req.body.lng;
  var desc = req.body.detail;
  var timestamp = req.body.timestamp;
  addPatientLocation(id,lat,lng,desc,timestamp,req,res)
});

app.post('/editPatient:id', function(req, res) {
  var id = req.body.id;
  var lid = req.body.lid;
  var lat = req.body.lat;
  var lng = req.body.lng;
  var desc = req.body.detail;
  var timestamp = req.body.timestamp;
  editPatientLocation(id,lid,lat,lng,timestamp,desc,req,res)
});

// User
app.get('/user', (req,res) => {
  if (req.session.loggedin && (req.session.role == "Admin" || req.session.role == "Staff")) {
    userData(function(user){
      res.render("menu/userList.ejs",{ email: req.session.email, role: req.session.role, user: user})
    })
} else {
  res.redirect('/');
}
})

// Logout
app.get('/logout',(req,res) => {
  req.session.destroy((err) => {
      if(err) {
          return console.log(err);
      }
      res.redirect('/');
  });
});

// route for handling 404 requests(unavailable routes)
app.use(function (req, res, next) {
  res.status(404).render("404.ejs")
});

// App run server
app.listen(port, function() {
    console.log('Server is running on port '+port)
})