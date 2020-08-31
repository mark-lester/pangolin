requirejs.config({
	paths: {
		backbone:'/backbone/backbone',
		marionette:'/backbone.marionette/lib/backbone.marionette',
		liquid:'/liquidjs/dist/liquid.browser.min',
		jquery:"/jquery/dist/jquery.min",	
		underscore:"/underscore/underscore-min",	
		gemini:"gemini",	
		backbone_radio:'/backbone.radio/build/backbone.radio',
	},
	shim: {
		jquery: {
			exports: '$'
		},
        	backbone: {
			deps: ["underscore", "jquery"],
			exports: "Backbone"
        	},
        	marionette: {
			deps: ["backbone","backbone_radio"],
			exports: "Backbone.Marionette"
        	},
		gemini:{
			deps:['marionette','backbone']
		},
	}
});

require(['jquery','underscore','backbone','marionette','liquid','gemini'],Main)

function Main($,_,Backbone,Marionette,Liquid,Gemini){
	var app = new Marionette.Application()
	return Gemini.initialize()
	.then(app.start)
	.then(()=>{
		return app
	})
}
