#!/usr/bin/env node

var fs = require('fs');

var outputFormat = "\r\t\t\t";

var name;
var fields = false;
var models = false;
var collections = false;

var dsmcPath = '../../common/_dsmcController.js';
var commonFolder = "./common";
var api = "./api";
var modelFolder = api + "/models";
var controllerFolder = api + "/controllers";
var firstField = true;

function writeFile(fileName, contents) {
	fs.writeFile(fileName, contents, function (err) {
	  if (err) return console.log(err);
	  console.log('File:' + fileName + ' written');
	});
}

function camelCase (str) {
	return str.charAt(0).toLowerCase() + str.slice(1);;
}

var dsmc = createDsmc();

console.log();
console.log();

console.log("Creating Sails Model and Controller");

function mkDir(dir) {

	if(!fs.existsSync(dir)){
		fs.mkdirSync(dir, 0766, function(err){
			if(err){ 
				console.log(err);
				response.send("ERROR! Can't make the directory " + dir + "! \n");    // echo the result back
			}
		});   
	}
}

process.argv.forEach(function (val, index, array) {
	if (val.indexOf("-n") === 0) {
		name = array[index+1];
	}
	if (val.indexOf("-f") === 0) {
		fields = array[index+1];
	}
	if (val.indexOf("-m") === 0) {
		models = array[index+1];
	}
	if (val.indexOf("-c") === 0) {
		collections = array[index+1];
	}
});
console.log();
console.log();

if (!fields) {
	console.log("Please add -f with fields in a comma separated list before running.");
	return;
}

if (!name) {
	console.log("Please add -n with ModelName before running.");
	return;
}

if (models) {
	console.log("Models are one to one relationships. Creating " + models);
}

if (collections) {
	console.log("Collections are one to many relationships. Creating " + collections);
	console.log();
	console.log("===================================");
	console.log("****** NOTICE - PLEASE READ *******");
	console.log("===================================");
	console.log();
	console.log("BEFORE running sails lift");
	console.log();
	console.log("All field types default to string, please open and modify " + name + ".js.");
	console.log();
	console.log("Open and modify the value for the via property for associated collections and models in " + name + "Controller.js.");
	console.log();
	console.log("Queries type currently include");
	console.log();
	console.log("contains, startsWith, endsWith");
	console.log();
}

mkDir(commonFolder);
mkDir(api);
mkDir(modelFolder);
mkDir(controllerFolder);

writeFile(commonFolder + "/_dsmcController.js", dsmc);


var recordKeepingFields ="createdBy,updatedBy";

// CREATE MODEL.js
var model = createModel(name, fields, models, collections);
var modelName = name+".js";
writeFile(modelFolder + "/" + modelName, model);

// CREATE CONTROLLER.js
var controller = createController(name, fields);
var controllerName = name+"Controller.js";
writeFile(controllerFolder + "/" + controllerName, controller);

// USED TO RETURN RELATED TABLE DATA
// SQL PEEPS CONSIDER THIS AS A JOIN
// SOLVED BY SAILSJS adding populateAll()
var populateOutput;

function createFieldDefinition(field) {

	var addDefault = "";
		if (field === 'createdBy' || field === 'updatedBy') {
			addDefault = "defaultsTo: 'admin'," + outputFormat + "\t";
		} else {
			addDefault = "";
		}
	var addUniqueRequired = (firstField) ? "required: true," + outputFormat + "\tunique: true," + outputFormat + "\t" : ""; 
	firstField = false;
	return " " + outputFormat +
	    field + ": { " + outputFormat + "\t"+
	    addUniqueRequired + 
        addDefault+
        "type: 'string'" + outputFormat +
  		"}";
}

function createPropertiesArray(items, fnct) {
	var output = [];
	if (items) {
		var array = items.split(",");
		for (var i = 0; i < array.length; i++) {
			output.push(fnct(array[i]));
		};
	}
	return output;
}

function createDefinition(type, collection) {
	var via = "	//via: '";
    return " " + outputFormat +
	collection + ": { " + outputFormat +
	"	" + type + ": '" + collection.toLowerCase() + "'," + outputFormat +
	via + camelCase(collection) + "'" + outputFormat +
	"},\r";
}

function createCollectionsDefinition(collection) {
    return createDefinition("collection", collection);
}

function createModelsDefinition(model) {
    return createDefinition("model", model);
}

// SOLVED BY SAILSJS adding populateAll()
function createPopulateQuery(model) {
	return "//.populate('" + model + "')" + outputFormat;
}

function createModel(controller, fields, models, collections) {
	var collectionsOutput = createPropertiesArray(collections, createCollectionsDefinition);
	var modelsOutput = createPropertiesArray(models, createModelsDefinition);
	var fieldsOutput = createPropertiesArray(fields, createFieldDefinition);
	var recordKeepingOutput = createPropertiesArray(recordKeepingFields, createFieldDefinition);
		populateOutput = createPropertiesArray(collections, createPopulateQuery);
		populateOutput += createPropertiesArray(models, createPopulateQuery)

	var contents = "/**\r"+
	"* "+controller+".js\r"+
	"*\r"+
	"* @description :: Write something nice. Maybe send a card.\r"+
	"*/\r"+
	"/*\r"+
	"field: {\r"+
	"	type: 'string',\r"+
	"	required: true,\r"+
	"	unique: true\r"+
	"	// supported field types: string, text, integer, float, date, time, datetime, boolean, binary, array, json\r" +
	"},\r"+
	"*/\r"+
	"\r"+
	"module.exports = {\r\t"+
	"\r\t"+
	"	 attributes: {\r\t"+
	"	    " + fieldsOutput.join(',\r') + ",\r\t"+
	"	    " + collectionsOutput.join('\r') + "\r\t"+
	"	    " + modelsOutput.join(',\r') + "\r\t"+
	"	    " + recordKeepingOutput.join(',\r') + "\r\t"+
	"	 }\r\t"+
	"};\r\t";
	
	return contents;
}

function createController(controller, fields) {
	return 		"/**\r" +
	" * " + controller + "Controller\r" +
	" *\r" +
	" * @description :: Base API for "+ controller + "\r" +
	" */\r" +
	"\r" +
	"// Search Defaults\r" +
	"var defaults = {\r" +
	"	skip: 0,\r" +
	"	limit: 20,\r" +
	"	dir: 'desc',\r" +
	"	searchType: 'contains',\r" +
	"	primaryField: '" + fields.split(',')[0] + "'\r" +
	"}\r" +
	"\r" +
	"var methods = require('" + dsmcPath + "')(defaults);\r" +
	"\r" +
	"module.exports = methods;\r" +
	"\r" +
	"// Add custom methods and method overrides here\r" +
	"/*\r" +
	"methods.extra = function (req, res) {\r" +
	"                    return res.json({ title: 'custom method', message: 'Create custom methods as needed.'});\r" +
	"                };\r" +
	"methods.model = function (req, res) {\r" +
	"                    return res.json({ title: 'method override', message: 'Override an existing method.'});\r" +
	"                };\r" +
	"*/\r" +
	"module.exports = methods;\r";
}

function createDsmc() {
	return    "\n" + 
    "var setConfig = function(req, defaults) {\n" + 
    "\n" + 
    "    var config = {};\n" + 
    "    // model config\n" + 
    "    config.modelName = req.options.controller;\n" + 
    "    config.model = sails.models[config.modelName]._attributes;\n" + 
    "\n" + 
    "    // search config\n" + 
    "    var query = req.query;\n" + 
    "\n" + 
    "    // pagination\n" + 
    "    config.skip = parseInt(query.skip) || defaults.skip;\n" + 
    " \n" + 
    "    // search field and criteria\n" + 
    "    var searchString = query.search || req.params.id;\n" + 
    "    config.searchField = query.field || defaults.primaryField;\n" + 
    "\n" + 
    "    // To Do - allow date, or int\n" + 
    "    config.criteria = decodeURIComponent(searchString);\n" + 
    "    config.query = {};\n" + 
    "\n" + 
    "    // Queries currently include \n" + 
    "    // contains, startsWith, endsWith\n" + 
    "    //\n" + 
    "    // To Do - allow advanced queries \n" + 
    "    // <, <=, >, >=, !, like\n" + 
    "    config.searchType = query.searchType || defaults.searchType;\n" + 
    "    \n" + 
    "    if (config.criteria !== undefined && config.criteria !== 'undefined') {\n" + 
    "        var searchObj = {}\n" + 
    "        searchObj[config.searchType] = config.criteria;\n" + 
    "        config.query[config.searchField] = searchObj;\n" + 
    "    }\n" + 
    "\n" + 
    "    // limit is the default or as specified in the query\n" + 
    "    // if the query value for limit is 0 return all\n" + 
    "    config.limit = {};\n" + 
    "    if (query.limit !== '0') {\n" + 
    "        config.limit = parseInt(query.limit) || defaults.limit;\n" + 
    "    }\n" + 
    "\n" + 
    "    // sort order\n" + 
    "    config.dir = query.dir || defaults.dir || 'desc';\n" + 
    "    config.sort = {};\n" + 
    "    if (query.sort) {\n" + 
    "        config.sort[query.sort] = config.dir;\n" + 
    "    } else {\n" + 
    "        config.sort[config.searchField] = config.dir;\n" + 
    "    }\n" + 
    "\n" + 
    "    return config;\n" + 
    "}\n" + 
    "\n" + 
    "// perform search on properties of this model\n" + 
    "var performSearch = function(res, config, type) {\n" + 
    "    var output = [];\n" + 
    "    // model reference\n" + 
    "    return sails.models[config.modelName].find()\n" + 
    "    .where(config.query)\n" + 
    "    .populateAll()\n" + 
    "    .skip(config.skip)\n" + 
    "    .limit(config.limit)\n" + 
    "    .sort(config.sort)\n" + 
    "\n" + 
    "    .exec(function findCB(err,found){\n" + 
    "        while (found.length) {\n" + 
    "            var tmp = found.pop();\n" + 
    "            // return full object for search\n" + 
    "            if (type === 'search') {\n" + 
    "                output.push(tmp);\n" + 
    "            // return selected search field and id for get\n" + 
    "            } else {\n" + 
    "                var tmpObj = {}\n" + 
    "                tmpObj[config.searchField] = tmp[config.searchField];\n" + 
    "                tmpObj.id = tmp.id;\n" + 
    "                output.push(tmpObj);\n" + 
    "            }\n" + 
    "        }\n" + 
    "       return res.json(output);\n" + 
    "    });\n" + 
    "}\n" + 
    "\n" + 
    "var searchRelatedModel = function(res, config, searchConfig) {\n" + 
    "    var foreignWhereQuery = {};\n" + 
    "    foreignWhereQuery[searchConfig.via] = { contains: config.criteria };\n" + 
    "    // returned from initial related data query\n" + 
    "    // then reset and returned from join table\n" + 
    "    var foreignIdArray = []; \n" + 
    "    return sails.models[config.searchField].find()\n" + 
    "        .where(foreignWhereQuery)\n" + 
    "        .then(function(relatedDocs){\n" + 
    "            for (var i = relatedDocs.length - 1; i >= 0; i--) {\n" + 
    "                foreignIdArray.push(relatedDocs[i].id);\n" + 
    "            };\n" + 
    "            //no relatedDocs found\n" + 
    "            if(relatedDocs === undefined) {\n" + 
    "                return ({notFound:true});\n" + 
    "            }\n" + 
    "            var whereQuery = {};\n" + 
    "            whereQuery[config.searchField] = { '$in':foreignIdArray };\n" + 
    "\n" + 
    "            // get primary data using primaryIdArray\n" + 
    "            return sails.models[config.modelName].find()\n" + 
    "            .where(whereQuery)\n" + 
    "            .populateAll()\n" + 
    "            .then(function(found){\n" + 
    "                return res.json(found);\n" + 
    "            });\n" + 
    "    });\n" + 
    "}\n" + 
    "\n" + 
    "var searchReleatedCollection = function (res, config, searchConfig) {\n" + 
    "    var output = [];\n" + 
    "\n" + 
    "    // Result from initial query is an array of ids \n" + 
    "    // that belong to the searched properties collection\n" + 
    "    // Join table will be queryed using this array\n" + 
    "    var foreignIdArray = []; \n" + 
    "\n" + 
    "    // Result from join/second query is an array of ids \n" + 
    "    // that belong to the primary collection\n" + 
    "    var primaryIdArray = [];\n" + 
    "\n" + 
    "    // join table config / get references to external collection and its join table\n" + 
    "    var foreignTableName = searchConfig.collection;\n" + 
    "    var joinTableForeignField = searchConfig.via + '_' + searchConfig.via;\n" + 
    "    var joinTableModelField = config.modelName + '_' + config.searchField;\n" + 
    "    var joinTableName = joinTableModelField.toLowerCase() + '__' + joinTableForeignField;\n" + 
    "\n" + 
    "    var whereQuery = {};\n" + 
    "    whereQuery[searchConfig.via] = { contains: config.criteria };\n" + 
    "\n" + 
    "    // get matching related data and ids\n" + 
    "    // get foreign data using \n" + 
    "    // config.criteria\n" + 
    "    return sails.models[foreignTableName].find()\n" + 
    "    .where(whereQuery)\n" + 
    "    .then(function(relatedDocs){\n" + 
    "        for (var i = relatedDocs.length - 1; i >= 0; i--) {\n" + 
    "            foreignIdArray.push(relatedDocs[i].id);\n" + 
    "        };\n" + 
    "\n" + 
    "        //no relatedDocs found\n" + 
    "        if(relatedDocs === undefined) {\n" + 
    "            return ({notFound:true});\n" + 
    "        }\n" + 
    "\n" + 
    "        // get join table data\n" + 
    "        // with primary record\n" + 
    "        // using foreignArray ids\n" + 
    "        var foreignWhereQuery = {};\n" + 
    "        foreignWhereQuery[joinTableForeignField] = foreignIdArray;\n" + 
    "        return sails.models[joinTableName].find()\n" + 
    "        .where(foreignWhereQuery)\n" + 
    "        .then(function(joinData){\n" + 
    "            for (var i = joinData.length - 1; i >= 0; i--) {\n" + 
    "                primaryIdArray.push(joinData[i][joinTableModelField]);\n" + 
    "            };\n" + 
    "            // get primary data using primaryidarray\n" + 
    "            var whereQuery = {id:{'$in':primaryIdArray}};\n" + 
    "            return sails.models[config.modelName].find()\n" + 
    "            .where(whereQuery)\n" + 
    "            .populateAll()\n" + 
    "            .then(function(found){\n" + 
    "                return res.json(found);\n" + 
    "            });\n" + 
    "        });\n" + 
    "    });\n" + 
    "}\n" + 
    "\n" + 
    "module.exports = function(defaults) {\n" + 
    "    \n" + 
    "\n" + 
    "    var module = {\n" + 
    "\n" + 
    "        get: function (req, res) {\n" + 
    "            var config = setConfig(req, defaults);\n" + 
    "            return performSearch(res, config, 'get');           \n" + 
    "        },\n" + 
    "\n" + 
    "        search: function (req, res) {\n" + 
    "\n" + 
    "            // set search criteria\n" + 
    "            var config = setConfig(req, defaults);\n" + 
    "            // reads fields type from model to determine search type below\n" + 
    "            var searchConfig = config.model[config.searchField];\n" + 
    "\n" + 
    "            // perform search on properties of this model\n" + 
    "            if (!searchConfig.hasOwnProperty('via') && !searchConfig.hasOwnProperty('model') && !searchConfig.hasOwnProperty('collection') ) {\n" + 
    "                performSearch(res, config, 'search');           \n" + 
    "            }\n" + 
    "\n" + 
    "            // perform search on properties of external model\n" + 
    "            // one to one relationship\n" + 
    "            if (searchConfig.hasOwnProperty('model')) {\n" + 
    "                searchRelatedModel(res, config, searchConfig);\n" + 
    "            }\n" + 
    "\n" + 
    "            // perform search on properties of external collection\n" + 
    "            // one to many / many to many\n" + 
    "            if (searchConfig.hasOwnProperty('collection')) {\n" + 
    "                searchReleatedCollection(res, config, searchConfig);\n" + 
    "            }\n" + 
    "        },\n" + 
    "\n" + 
    "        model: function(req, res) {\n" + 
    "            var config = setConfig(req, defaults);\n" + 
    "            return res.json(config.model);\n" + 
    "        },\n" + 
    "\n" + 
    "        displayOrder: function(req, res) {\n" + 
    "            var config = setConfig(req, defaults);\n" + 
    "            var array = [];\n" + 
    "            for (var prop in config.model) {\n" + 
    "                array.push(prop);\n" + 
    "            }\n" + 
    "            return res.json(array);\n" + 
    "        },\n" + 
    "\n" + 
    "        // Does not work with external collections and models\n" + 
    "        getCount: function(req, res) {\n" + 
    "            var config = setConfig(req, defaults);\n" + 
    "            sails.models[config.modelName].count(config.query).exec(function countCB(err, found){\n" + 
    "                return res.json(found);\n" + 
    "            });\n" + 
    "        }\n" + 
    "    }\n" + 
    "    return module;\n" + 
    "};\n";
}