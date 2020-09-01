define(['jquery','underscore','backbone','marionette'], 
function($,_,Backbone,Marionette){
	var Gemini= {
		apiBase:'/api/',
	};

	Gemini.initialize=async function(options){
		Gemini.dictionary= new Gemini.Dictionary();
		await Gemini.dictionary.fetch()
		Gemini.instantiateDataModel()
		await Gemini.bootDataModel()
		return Gemini
	 }

	Gemini.instantiateDataModel=function(){
		Gemini.dictionary.each(function(resource){
			resource.collection=new (resource.Collection)();
			resource.model=new (resource.Model)();
		})
	}

	Gemini.bootDataModel=async function(){
		Gemini.dictionary.each(async function(resource){
			await resource.collection.fetch()
		})
	}
		 
	Gemini.DictionaryModel=Backbone.Model.extend({
    		initialize:function(){
			const def=this.toJSON()
    			this.Model=Backbone.Model.extend({
				urlRoot:urlRoot.bind(def),
				idAttribute:idAttribute.bind(def)
			})
	  		this.Collection=Backbone.Collection.extend({
				url:urlRoot.bind(def),
				Model:this.Model,
			})
		}
	})

	Gemini.Dictionary=Backbone.Collection.extend({
	        url:Gemini.apiBase,
	      	model:Gemini.DictionaryModel,  
	});

	function idAttribute(){
		return this.controllers.read.endpoint.attributes[0]
	}

	function urlRoot(){
		return this.endpoints.plural
	}

	return Gemini;
});
