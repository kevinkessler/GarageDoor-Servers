var config=require('./config.js');

var EventSource = require('eventsource')
	,nodemailer=require('nodemailer')
	,debug=require('debug')('texter')
   ,util=require('util');

var deviceID=config.deviceID;
var access_token=config.access_token;
var toAddrs=config.toAddrs;
var closeTime=config.closeTime;

var closeTimeout;
var heartbeatTimer;
var notifyClose=0;

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
	
	if (doorState.data == "OPEN") {
		if((closeTimeout==null)||(closeTimeout._idleTimeout==-1)) {
			closeTimeout=setTimeout(function() {
				smsMessage("!!!!Door not closed in "+closeTime+" seconds!!!");
				notifyClose=1;},
				closeTime*1000);
		}
		console.log(new Date().toString()+": Door is Opened");
	} else {
		clearTimeout(closeTimeout);
		if(notifyClose==1) {
			smsMessage("Garage Door opened and closed");
			console.log(new Date().toString()+": Door is closed");
			notifyClose=0;
		}
	}
	
});

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

