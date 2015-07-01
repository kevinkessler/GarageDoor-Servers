var config=require('./config.js');

var loggly=require('loggly');

var client = loggly.createClient({
    token: config.logglyToken,
    subdomain: config.logglySubdomain,
    tags: ['GarageDoor'],
    json:true
});

exports.log=function(status,message){
	client.log({"status":status,"message":message});
}