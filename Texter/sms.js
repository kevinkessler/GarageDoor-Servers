var nodemailer=require('nodemailer'),
    util=require('util');

var smtp=nodemailer.createTransport({
	service:"Gmail",
	auth: {
		user: "***REMOVED***@gmail.com",
		pass: "***REMOVED***"
	}
});

smtp.sendMail({
	from: "Home Automation <***REMOVED***@gmail.com>",
	to: "4102277528@vtext.com",
	text: "2 Node JS Text"
	//html: 'A Picture <img src="cid:me@kkessler.com"/>',
	//attachments: [{
//		filename: 'test.jpg',
//		path: './test.jpg',
//		cid: 'me@kkessler.com'
//	}]
	}, function(error,response) {
		if(error) {
			console.log(error);
		}else{
			console.log("Message sent", util.inspect(response));
	}
});

