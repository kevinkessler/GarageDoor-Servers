var config=require('./config.js');

var net=require('net')
    ,fs = require('fs')
    ,path = require('path')
    ,gd = require('./googleDrive.js')
    ,wrapper=require('./logwrapper.js');

var HOST = '0.0.0.0';
var PORT = config.port;
var lastPic="";

exports.startCatcher=function() {
    setInterval(function() {
        fs.readdir(config.picpath, function(err,files){
            if(err)
            {
                wrapper.log("ERROR","Error Reading Directory:"+config.picpath+" "+err);
            }

            files.forEach(function(f){
                var fname=path.join(config.picpath,f);
                fs.stat(fname,function(err,stats){
                    if(err)
                    {
                        wrapper.log("ERROR","Error stating file:"+fname+" "+err);

                    }
                    if(stats.isFile())
                    {
                        var age=Date.now() - stats.mtime
                        if(age > config.maxAgeInSecs * 1000) {
                        fs.unlink(fname,function(err){
                            if(err)
                            {
                                wrapper.log("ERROR","Error deleting file:"+fname+" "+err);
                            }
                            wrapper.log("DEBUG",fname+" deleted");
                        });
			}
                    }
                });
            });
        });
    },3600000);

    net.createServer(function(sock) {
        
        sock.setEncoding('binary');
        wrapper.log("CONNECT",sock.remoteAddress +':'+ sock.remotePort);
        var desc;
        var fileName=config.picpath+'/'+config.prefix+tStamp(new Date())+'.jpg';
        wrapper.log("DEBUG",'Filename: '+fileName);
        fs.open(fileName,'a',0666, function (err,fd){
            if(err)
                wrapper.log("ERROR","File Open Error "+err);
            desc=fd;

            sock.on('data', function(data) {
                
                var buf=new Buffer(data);
                fs.write(desc,data,null,'binary',function(err,written){
                    if(err) {
                        wrapper.log("ERROR","File Write Error "+err);
                    }

                });
                
            });
            
            
            sock.on('close', function(data) {
                lastPic=fileName;
                fs.closeSync(desc);
                gd.saveGoogleJpg(fileName,config.googleDriveFolder);
            });

            sock.on('error', function(err) {
                wrapper.log("ERROR","Socker Error "+err);
            });
        });

        
    }).listen(PORT, HOST);

    var now=tStamp(new Date());
    wrapper.log("DEBUG",'Server listening on ' + HOST +':'+ PORT+" at "+now);
}

exports.getLastFile=function() {
    return lastPic;
}

function tStamp(theTime)
{
    var ms=zeroOut(theTime.getMonth()+1);
    var hs=zeroOut(theTime.getHours());
    var mins=zeroOut(theTime.getMinutes());
    var ss=zeroOut(theTime.getSeconds());
    var day=zeroOut(theTime.getDate());

    return ""+theTime.getFullYear()+ms+day+hs+mins+ss;
}

function zeroOut(n)
{
    return (n<10) ? "0" + n : "" + n;
}

