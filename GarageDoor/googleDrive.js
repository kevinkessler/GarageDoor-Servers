var google = require('googleapis')
    ,fs = require('fs')
    ,path = require('path')
    ,config = require('./config.js');


exports.saveGoogleJpg=function(jpg,folder) {
   var jwtClient = new google.auth.JWT(
    config.googleServiceAccount,
    config.googlePemFile,
    null,
    ['https://www.googleapis.com/auth/drive.file'],
    config.gmailUser);

   var stream=fs.createReadStream(jpg);
   stream.on('error',function(error){
    console.error("Cannot Open "+jpg);
    console.error(error);
    return;
   });

   stream.on('readable',function(){
    jwtClient.authorize(function(err, tokens) {
      if (err) {
        console.log(err);
        return;
      }

      var drive = google.drive({ version: 'v2', auth: jwtClient });
      drive.files.list({q: "mimeType='application/vnd.google-apps.folder' and title='"+folder+"'"},
          function(err1,resp){
        if(resp == null) {
          console.error("Google File list for "+folder+" failed");
          return;
        }

        var files=resp.items;
        if(files.length == 0 ){
          console.error("Folder "+folder+" does not exist");
          return;
        }
        files.forEach(function(f){
          console.log(f.id);
          drive.files.insert({
            resource: {
              title: path.basename(jpg),
              mimeType: 'image/jpg',
              parents:[{'id':f.id}]
            },
            media: {
              mimeType: 'image/jpg',
              body: stream
            }
          }, function(err2,resp){
            if(err2) {
              console.error("Error storing image to Google Drive");
              console.error(err2);
            }
          });
        });
      });
    });
  });
   
}

 