#!/usr/bin/node
const Pangolin=require('./index.js')
const cookieParser = require('cookie-parser')
const express = require('express')
const path = require('path')
const rewrite = require('express-urlrewrite')

const app=express()
const options={
	app:app,
	DataSource:{
		database:'demo',
		user:'demo',
		password:'demo',
		host:'localhost',
		dialect:'mysql',
		directory:__dirname+'/demo_models'
	},
	MarmotSource:{
		database:'marmot',
		user:'marmot',
		password:'marmot',
		host:'localhost',
		dialect:'mysql'
	},
	apiBase:'/api',
}
app.set('port',options.webport || 8080);
const pangolin=new Pangolin(options)
pangolin.initialize()
.then(Main)


async function Main(){
	var server = app.listen(app.get('port'), function() {
		console.log('Express server listening on port ' + server.address().port);
	})
	app.engine('html', pangolin.engine.express());
	app.set('views', './html');
	//path.resolve(__dirname, "html"));
	app.set('view engine', 'html');
	app.use(cookieParser())
	app.use(async (req, res,next)=> {
		var locale
		if (req.cookies.locale)
			locale=req.cookies.locale
		if (req.query.locale)
			locale=req.query.locale

		if (locale){
			await pangolin.set_locale(locale)
		}
		next()
	})
	app.use(rewrite('/','/index.html'));
	app.get('/:file.html', function (req, res) {
		var env=Object.assign({},process.env)
		res.render(req.params.file, env)
	})
	app.use(express.static(__dirname + '/js'));
	app.use(express.static(__dirname + '/node_modules'));
	app.use(express.static(__dirname + '/node_modules/backbone.radio/build'));
}
