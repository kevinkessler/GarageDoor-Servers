var config=require('./config.js');

var net=require('net');
var fs = require('fs');

var HOST = '0.0.0.0';
var PORT = config.port;

net.createServer(function(sock) {
    
    sock.setEncoding('binary');
    console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
    var desc;
    var fileName=config.picpath+'/'+config.prefix+tStamp(new Date())+'.jpg';
    console.log('Filename: '+fileName);
    fs.open(fileName,'a',0666, function (err,fd){
    	if(err)
    		console.error(error);
    	desc=fd;

    });

    sock.on('data', function(data) {
        
        console.log('DATA ' + sock.remoteAddress + ': ' + data);
        var buf=new Buffer(data);
        fs.write(desc,data,null,'binary',function(err,written){
        	if(err)
        		console.error(error);

        	console.log("Bytes written: "+written);

        });
        
    });
    
    
    sock.on('close', function(data) {
        fs.close(desc,function(){
        	console.log("Close "+fileName);
        })
    });
    
}).listen(PORT, HOST);

var now=tStamp(new Date());
console.log('Server listening on ' + HOST +':'+ PORT+" at "+now);

function tStamp(theTime)
{
	var ms=zeroOut(theTime.getMonth()+1);
	var hs=zeroOut(theTime.getHours());
	var mins=zeroOut(theTime.getMinutes());
	var ss=zeroOut(theTime.getSeconds());

	return ""+theTime.getFullYear()+ms+theTime.getDate()+hs+mins+ss;
}

function zeroOut(n)
{
	return (n<10) ? "0" + n : "" + n;
}