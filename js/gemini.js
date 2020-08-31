define(['jquery','underscore','backbone','marionette'], 
function($,_,Backbone,Marionette){
	
	// we only need this because backbone.Collection only sticks the models in as a block, 
	// so you cant reference relational tree links during intialziation :(
	var dictionaryStore={};
	function makeText(camelCase){
		return camelCase
			.replace('_',' ')
			.replace(/([A-Z])/g, " $1" )
			.replace('  ',' ')
			.replace(/^\s+/,'')
			.replace(/\w\S*/g, function(txt){
				return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
			});
	};

	var Gemini= {
		apiBase:'/api/',
		collapseList:{}
	};

	Gemini.initialize=function(options){
		Gemini.dictionary= new Gemini.Dictionary();
		return Gemini.dictionary.fetch()
	 }
		 
	Gemini.DictionaryModel=Backbone.Model.extend({
    		initialize:function(){
			console.log("I HAVE INITIALIZED"+JSON.stringify(this))
		},
	});

	Gemini.instantiateDataModel=function(){
		Gemini.dictionary.each(function(resource){
			if (resource.Options.noCollection)
				return;
			if (resource.Options.extend){
				resource.collection=dictionaryStore[resource.Options.extend].collection;
				resource.model=dictionaryStore[resource.Options.extend].model;
			} else {
				resource.collection=new (resource.Collection)();
				resource.model=new (resource.Model)();
			}
		});
	};

	

	Gemini.bootDataModel=function(){
		var jobs=[]
		Gemini.dictionary.each(function(resource){
			if (resource.Options.noCollection)
				return;
	  		// if this is an orphan then fetch, else expect a parent table
	  		// to invoke you via it's update message
			
	  		if (resource.collection !== undefined)
	  	  		jobs.push(resource.collection.fetch() )				
		})
		return Promise.all(jobs)
	}

	Gemini.Dictionary=Backbone.Collection.extend({
	        url:Gemini.apiBase,
	      	model:Gemini.DictionaryModel,  
	});

// TODO - use proper url param manager
		 
	function urlCollection(){
		var url=Gemini.apiBase;
		if (this.parent){
			url += this.parent.collection.tableName+'/'+this.parent_cursor.getValue()+'/'
		}
		url += (this.options.Options.handler || this.tableName);
		url += "?";
		if (this.clone_under){
			url+=this.clone_under;
		}

		if (this.Options.include)
			url+="&_i="+this.Options.include.join(',');	        	 
		
		var sort_clause=
			_.filter(this.attributes,function(att){
				return att.order !== undefined || att.reverseOrder !== undefined
			})
			.sort(function(att){
				return att.order
			})
			.map(function(att){
				return (att.reverseOrder !== undefined ? '-' : '')+ att.field
			})
			.join(',');


		if (sort_clause.length)
			url+='&_sort='+sort_clause;

		if (this.options.Options.limit)
			url+="&count="+this.options.Options.limit;
		return url;
	}

	function urlRoot(){
		return Gemini.apiBase+this.tableName;
	}
	function url(){
		return this.urlRoot()+'/'+this.get('id');
	}
		 
	Gemini.Model=Backbone.Model.extend({
		urlRoot:urlRoot,
		getCursor:function(){
			return this.id;
		},
		save:function(vals,options){
			return Backbone.Model.prototype.save.call(this, vals,options);
		},

		setListeners:function(){
			if (!Gemini.io || this.Options.silent)
				return;
			var self=this;
			var subject=Gemini.config.webport+":receive:"+this.name+":"+this.get('id');
			if (this.subject === subject || !this.get('id'))
				return;
			this.subject=subject;

			Gemini.io.removeListener(this.subject)
			this.listener=Gemini.io.on(this.subject,function(message){
				if (message.action==='DELETE')
					return;// self.destroy(),

				if (!_.isEmpty(message.model))
					return self.set(message.model);
				else
					return self.fetch();
			});

		},

		initialize:function(){
			var self=this;
			this.children={};
			this.setListeners();
//			_.each(
/*
				if (this.get('dataType') === 'block'){
					self.childCollection=new (self.resource.Collection.extend({
						parentModel:self,
						cursorObject:self.cursorObject,
						subNode:true
					}))();
				}
*/

		},
	});

	Gemini.Collection=Backbone.Collection.extend({
		model:Gemini.Model,
		url:urlCollection,

		fetch : function(options) {
			var self=this;
			//console.log("I AM A FETCHER "+this.name)

//			if (this.parent && !this.Options.orphan && !this.parent.getCursor()){
//				return this.trigger("clear");
//				this.reset();
//				return;
//			}
//console.log("FETCHING COLLECTION, MODEL="+this.name+" URL="+this.url());
			return Backbone.Collection.prototype.fetch.call(this, options)
			.then(function(){
				var found=false;
				var first=undefined;
				var first_model=undefined;
				self.each(function(model){
//console.log("POST FETCH CHECK OF "+self.name+" MODEL="+JSON.stringify(model));
					if (!model)
						return;
					if (!first){
						first=model.get('id')
						first_model=model
					}
				})
				if (first){
					self.cursor.setValue(first)
					self.resource.model.set(first_model.attributes)
					self.resource.model.trigger('changed')
				}
			});
		},


		setStatus:function(status){
			this.status=status;
			this.trigger("status_changed");
		},

		initialize:function(){
			var self=this;
			this.cursor=Gemini.GetCursor(this.name)

			this.resource=Gemini.dictionary.find({name:this.name});
			if (!this.resource.parents.length)
				return
			this.parent=Gemini.dictionary.find({name:this.resource.parents[0]})
//			if (this.parent_cursor)
//				return
			this.setParentCursor(this.parent.collection.cursor)
			this.on('clear',function(){
				self.reset()
				self.cursor.setValue(undefined)
			})
	    },
		setParentCursor:function(parent_cursor){
			var self=this
			if (this.parent_cursor){
				// unlisten
			}
			this.parent_cursor=parent_cursor
			this.listenTo(this.parent_cursor,"changed",function(message){
				self.fetch()
			});
			this.listenTo(this.parent_cursor,"clear",function(message){
				self.trigger("clear")
			});
		},
		getChildCollectionOf:function(id){
			if (!this.Options.tree)
				return this.childCollection;
			if (this.get(id))
				return this.get(id).childCollection;
			for (var i=0;i<this.length;i++){
				if (	this.at(i).get('dataType')==='block' && 
					this.at(i).childCollection){
					var c=this.at(i).childCollection.getChildCollectionOf(id);
					if (c)
						return c;
				}
			}

			return;
		},

	 	preRender:function(){
			_.each(this.models,function(model){
				if (model.Options.preRender !== undefined){
					model.Options.preRender.bind(model)();
				}
			});
	 	},

    });

	Gemini.CursorStore=[]
	Gemini.GetCursor=function(name){
		if (!Gemini.CursorStore[name]){
			Gemini.CursorStore[name]=new Gemini.Cursor(name)
//			Gemini.CursorStore[name].initialise()
		}

		return Gemini.CursorStore[name]
	}
	Gemini.Cursor=Backbone.Model.extend({
		initialize:function(name){
			this.name=name
		},
		getValue:function(){
			return this.value
		},
		setValue:function(value){
			this.value=value
			if (value)
				this.trigger("changed")
			else
				this.trigger("clear")
		},
		destroy:function(){
			delete Gemini.CursorStore[this.name]
		}
	});
	Gemini.string2Bin=function string2Bin(str) {
		var result = [];
		for (var i = 0; i < str.length; i++) {
		  result.push(str.charCodeAt(i));
		}
		return result;
	  }
	  
	Gemini.bin2String=  function bin2String(array) {
		return String.fromCharCode.apply(String, array);
	  }

		     
//	Gemini.ModelView=Backbone.Marionette.ItemView.extend({
	//	template: '#EditTemplate',		
//	});
		 	
	return Gemini;
});
