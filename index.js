const { Sequelize, Model, DataTypes } = require("sequelize");
const SequelizeExtended = require('sequelize-modelreader')(Sequelize)
const Foxbat=require('foxbat')
const Liquid=Foxbat()
const GrandFinale=require("grand-finale")
const assert = require('assert')
const defaultOptions={
	DataSource:{
		database:'marmot',
		user:'marmot',
		password:'marmot',
		host:'localhost',
		dialect:'mysql',
		directory:'./models'
	},
	restDirectory:__dirname+'/rest',
	apiBase:'./api',
	defaultLocale:'en',
}
module.exports=class Pangolin{
	constructor(options){
		options=options||{}
		assert(options.app)
		this.options=Object.assign(defaultOptions,options)
		this.options.DataSource=Object.assign(defaultOptions.DataSource,options.DataSource)
		this.sequelize=new SequelizeExtended(
			this.options.DataSource.user,
			this.options.DataSource.password,
			this.options.DataSource.database,
			this.options.DataSource)
		this.sequelize.loadModels(this.options.DataSource.directory,DataTypes)
		this.engine=new Liquid(this.options.MarmotSource)
		this.grand_finale=new GrandFinale({
			app:this.options.app,
			sequelize:this.sequelize,
			DataTypes:DataTypes,
			directory:this.options.restDirectory,
			base:this.options.apiBase,
		})
		this.grand_finale.initialize()
	}

	async initialize(){
		await this.engine.marmot.initialize(this.options.defaultLocale)
		await this.sequelize.sync()
	}
	async set_locale(locale){
		await this.engine.marmot.set_locale(locale)
	}
	get_locale(){
		return this.engine.marmot.get_locale()
	}

}
