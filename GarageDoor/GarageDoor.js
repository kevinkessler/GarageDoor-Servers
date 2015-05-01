var config=require('./config.js');

var EventSource = require('eventsource')
	,nodemailer=require('nodemailer')
	,debug=require('debug')('texter')
	,util=require('util')
	,pc=require('./pictureCatcher.js')
	,https=require('https')
	,os=require('os');

var deviceID=config.deviceID;
var access_token=config.access_token;
var toAddrs=config.toAddrs;
var closeTime=config.closeTime;

var holdTimeout;
var heartbeatTimer;
var fcPic=0;

var es= new EventSource('https://api.spark.io/v1/devices/'+deviceID+'/events?access_token='+access_token);
debug('New Event Source '+util.inspect(es,{ showHidden: true, depth: null }));

var smtp=nodemailer.createTransport({
	service:"Gmail",
	auth: {
		user: config.gmailUser,
		pass: config.gmailPass
	}
});

debug('New Mailer '+util.inspect(smtp,{ showHidden: true, depth: null }));

es.addEventListener("garagedoor-event", function(e) {
	var doorState = JSON.parse(e.data);
	//debug(util.inspect(e));

	clearTimeout(heartbeatTimer);
	heartbeatTimer=setTimeout(function() {
		smsMessage("!!!Heartbeat Failure!!!");
		console.log(new Date().toString()+": Heartbeat Failure");
   },config.heartbeatTimeout*1000);
	
	selectEvent(doorState);	
});

var heartbeat=setInterval(function() {
	sendConfig();
},3600*1000);
pc.startCatcher();
sendConfig();

function smsMessage(mes) {
	smtp.sendMail({
		from: "Home Automation <"+config.gmailUser+">",
		to: toAddrs,
		text: mes
	}, function(error,response) {
		if(error) {
			console.error(error);
		}else{
			debug(new Date().toString()+": Message sent "+util.inspect(response));
		}
	});
}

function smsPicMessage(mes,fileName) {
	smtp.sendMail({
		from: "Home Automation <"+config.gmailUser+">",
		to: toAddrs,
		text: mes,
		html: '<img src="cid:me@kkessler.com"/>',
		attachments: [{
			filename: 'image.jpg',
			path: fileName,
			cid: 'me@kkessler.com'
		}]
	}, function(error,response) {
		if(error) {
			console.error(error);
		}else{
			debug(new Date().toString()+": Message sent "+util.inspect(response));
		}
	});
}
function selectEvent(doorState) {

	if(doorState.data.substr(0,5)=="Temp:") {
		sendTemp(doorState.data);
		return;
	}

	switch(doorState.data) {
		case "OPEN":
			console.log(new Date().toString()+": Door is Opened");
			debug(new Date().toString+": "+doorState.data);
			break;
		case "CLOSED":
			clearInterval(holdTimeout);
			console.log(new Date().toString()+": Door is closed");
			debug(new Date().toString+": "+doorState.data);
			break;
		case "HOLD-OPEN":
			console.log(new Date().toString()+": Hold Button Activated");
			debug(new Date().toString+": "+doorState.data);
			takePicture();
			holdTimeout=setInterval(function() {
				console.log("Garage Door Held Open Alert");
				debug(new Date().toString+": "+doorState.data);
				smsPicMessage("Garage Door is Being Held Open",pc.getLastFile());
				takePicture();
			},config.holdTime);
			break;
		case "CONFIGURE":
			console.log(new Date().toString()+": Configure Requested");
			debug(new Date().toString+": "+doorState.data);
			sendConfig();
			break;
		case "MOTION":
			console.log(new Date().toString()+": Motion Detected");
			debug(new Date().toString+": "+doorState.data);
			break;
		case "FORCE-CLOSE":
			console.log(new Date().toString()+": Force Closed");
			debug(new Date().toString+": "+doorState.data);
			takePicture();
			fcPic=1;
			break;
		case "PowerDown" :
			if(fcPic==1) {
				smsPicMessage("Garage Door Automatically Closed", pc.getLastFile());
				fcPic=0;
			}
			debug(new Date().toString+": "+doorState.data);
			break;
		default:
			debug(new Date().toString+": "+doorState.data);
			break;
	}
}

function sendTemp(data)
{
	//console.log('Temperature: '+data.substr(5,data.length-5));
}

function sendConfig() {
	sparkRequest("config~"+os.hostname()+":"+config.port);
//	sparkRequest("config~"+"api.192.168.1.6.xip.io"+":"+config.port);

}

function takePicture() {
	sparkRequest("picture");
}

function sparkRequest(command){
	var postData="args="+command;
	var options={
		hostname: 'api.spark.io',
		port: 443,
		path: '/v1/devices/'+deviceID+'/command',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Authorization': 'Bearer '+access_token,
    		'Content-Length': postData.length
    	}

	}

	var req=https.request(options);
/*	var req=https.request(options,function(res) {
		console.log('STATUS: ' + res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('BODY: ' + chunk);
		});
	});*/

	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});

	req.write(postData);
	req.end();
}