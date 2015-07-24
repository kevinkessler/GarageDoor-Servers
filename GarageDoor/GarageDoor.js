var config=require('./config.js');

var EventSource = require('eventsource')
	,nodemailer=require('nodemailer')
	,util=require('util')
	,pc=require('./pictureCatcher.js')
	,https=require('https')
	,os=require('os')
	,wrapper=require('./logwrapper.js');
 


var deviceID=config.deviceID;
var access_token=config.access_token;
var toAddrs=config.toAddrs;
var closeTime=config.closeTime;

var holdTimeout;
var heartbeatTimer;
var fcPic=0;
var fcEvent=0;
var fcStatus;

var tempMinAccum=0;
var tempMinCount=0;
var tempHourAccum=0;
var tempHourCount=0;

var es= new EventSource('https://api.spark.io/v1/devices/'+deviceID+'/events?access_token='+access_token);
wrapper.log("DEBUG",'New Event Source '+util.inspect(es,{ showHidden: true, depth: null }));

var smtp=nodemailer.createTransport({
	service:"Gmail",
	auth: {
		user: config.gmailUser,
		pass: config.gmailPass
	}
});

wrapper.log("DEBUG",'New Mailer '+util.inspect(smtp,{ showHidden: true, depth: null }));

es.addEventListener("garagedoor-event", function(e) {
	var doorState = JSON.parse(e.data);

	clearTimeout(heartbeatTimer);
	heartbeatTimer=setTimeout(function() {
		smsMessage("!!!Heartbeat Failure!!!");
		wrapper.log("ERROR","Heartbeat Failure");
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
			wrapper.log("ERROR","SMSMessage Error "+error);
		}else{
			wrapper.log("DEBUG","Message sent "+util.inspect(response));
		}
	});
}

function smsPicMessage(mes,fileName) {
	smsMessage(mes);
	smtp.sendMail({
		from: "Home Automation <"+config.gmailUser+">",
		to: toAddrs,
		html: mes+'<img src="cid:me@kkessler.com"/>',
		attachments: [{
			filename: 'image.jpg',
			path: fileName,
			cid: 'me@kkessler.com',
			contentDisposition: 'inline'
		}]
	}, function(error,response) {
		if(error) {
			wrapper.log("ERROR","SMS PIC Message Error "+error);
		}else{
			wrapper.log("DEBUG","Message sent "+util.inspect(response));
		}
	});
}
function selectEvent(doorState) {

	if(doorState.data.substr(0,5)=="Temp:") {
		sendTemp(doorState.data);
		return;
	}

	wrapper.log(doorState.data,"Door State Change");

	switch(doorState.data) {
		case "OPEN":
			if(fcEvent==1) {
				takePicture();
				fcPic=1;
				fcStatus="OPEN";
				fcEvent=0;
			}
			break;
		case "CLOSED":
			clearInterval(holdTimeout);
			if(fcEvent==1) {
				takePicture();
				fcPic=1;
				fcStatus="CLOSED";
				fcEvent=0;
			}

			break;
		case "HOLD-OPEN":
			takePicture();
			holdTimeout=setInterval(function() {
				wrapper.log("ALERT","Garage Door Held Open Alert");
				smsPicMessage("Garage Door is Being Held Open",pc.getLastFile());
				takePicture();
			},config.holdTime);
			break;
		case "CONFIGURE":
			sendConfig();
			break;
		case "MOTION":
			break;
		case "FORCE-CLOSE":
			fcEvent=1;
			break;
		case "PICTURE-SAVED" :
			if(fcPic==1) {
				if(fcStatus=="OPEN") {
					smsPicMessage("Garage Door Close Failure!!!", pc.getLastFile());
				}
				else if(fcStatus=="CLOSED"){
					smsPicMessage("Garage Door Automatically Closed Successfully", pc.getLastFile());
				}
				else {
					smsPicMessage("Texting Picture on demand", pc.getLastFile());
				}
				
				fcStatus="";
				fcEvent=0;
				fcPic=0;
			}
			break;
		default:
			break;
	}
}

function sendTemp(data)
{
	tempMinAccum+=Number(data.substr(5,data.length-5));
	tempHourAccum+=Number(data.substr(5,data.length-5));

	if(++tempMinCount==2)
	{
		wrapper.log("DEBUG","Temperature Minute Sent "+tempMinAccum/tempMinCount);
 		thingspeakRequest(config.thingspeak_minute_key,tempMinAccum/tempMinCount);
 		tempMinCount=0;
 		tempMinAccum=0;
	}

	if(++tempHourCount==120)
	{
		wrapper.log("DEBUG","Temperature Hour Sent "+tempHourAccum/tempHourCount);
 		thingspeakRequest(config.thingspeak_hour_key,tempHourAccum/tempHourCount);
 		tempHourCount=0;
 		tempHourAccum=0;
	}



}

function thingspeakRequest(key,gTemp)
{
	var postData="api_key="+key+"&field1="+gTemp;
	var options={
		hostname: 'api.thingspeak.com',
		port: 443,
		path: '/update',
		method: 'POST'
	}

	var req=https.request(options);
	req.on('error', function(e) {
		wrapper.log("ERROR",'Problem with thingspeak request: ' + e.message);
	});

	req.write(postData);
	req.end();

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


	req.on('error', function(e) {
		wrapper.log("ERROR",'Problem with request: ' + e.message);
	});

	req.write(postData);
	req.end();
}



