// =====================================
// DSMC - Default Sails Model Controller
// =====================================

var setLimit = function(query, defaults) {
    // limit is the default or as specified in the query
    // if the query value for limit is 0 return all
    var limit = {};
    if (query.limit !== '0') {
        limit = parseInt(query.limit) || defaults.limit;
    }
    return limit;
};

var setSort = function(query, dir) {
    var sort = {};
    if (query.sort) {
        sort[query.sort] = dir;
    } else {
        sort[config.searchField] = dir;
    }
    return sort;
};

var setSearchType = function (searchString, query, defaults) {
    // Check start of search string for non word characters
    // determine searchType
    var searchCriteriaHelperArr = ['contains', 'like', 'lessThan', 'lessThanOrEqual', 'greaterThan', 'greaterThanOrEqual', 'not', 'endsWith', 'startsWith'];
    var searchTypeArray = ['', '=', '<', '<=', '>', '>=', '!', '*'];
    var matchNonWordChars = [];
    var searchType;
    var startsWith = false;

    if (searchString) {
        matchNonWordChars = searchString.match(/(^\W+)/);
        // If multiple non word characters are found
        // use like with wild cards on both ends
        if ((searchString.match(/\*/g)||[]).length === 2) {
            searchType = searchCriteriaHelperArr[0];

        // If non word characters are found
        // determine searchType
        } else if (matchNonWordChars) {
            searchType = searchCriteriaHelperArr[searchTypeArray.indexOf(matchNonWordChars[0])];
        }

        // If no non word characters are found
        // check the end of the search string for non word characters
        // to determine searchType
        if (!matchNonWordChars) {
            matchNonWordChars = searchString.match(/(\W$)/);
            if (matchNonWordChars && matchNonWordChars[0] === '*') {
                searchType = searchCriteriaHelperArr[searchCriteriaHelperArr.length-1];
            }
        }
    }

    // In SailsJs like is equals unless the searchCriteria includes '%' in the searchCriteria
    searchType = (searchType === '=') ? 'like' : searchType || query.searchType || defaults.searchType;
    var nonWordChar = (searchTypeArray.indexOf(matchNonWordChars[0]) > -1) ? matchNonWordChars[0] : [];
    // return searchType and non word character matches
    return [searchType, nonWordChar];
}

var setQuery = function(searchString, searchField, searchTypeStringArr) {

    var query = {};

    // Use of special characters requires split / join to remove chars from string
    // var regex = new RegExp(find, 'g'); (regex wont work)
    if (searchTypeStringArr[0]) {
        searchString = searchString.split(searchTypeStringArr[1]).join('');
    }

    if (searchString !== undefined && searchString !== 'undefined') {
        var searchObj = {}
        searchObj[searchTypeStringArr[0]] = searchString;
        query[searchField] = searchObj;
    }
    return query;
}

var setConfig = function(req, defaults) {

    var config = {};
    // model config
    config.modelName = req.options.controller;
    config.model = sails.models[config.modelName]._attributes;

    // search config
    var query = req.query;

    // pagination
    config.skip = parseInt(query.skip) || defaults.skip;
 
    // search field and criteria
    var searchString = query.search || req.params.id;
    config.searchField = query.field || defaults.primaryField;

    // change property name for output obj
    if (query.as) {
        config.as = query.as;
    }
    // returns array with search type and any non-word chars that need to be replaced.
    var searchType = setSearchType(searchString, query, defaults);

    // Parse query string to determine search type
    config.query = setQuery(decodeURIComponent(searchString), config.searchField, searchType)
    console.log(config.query);
    // limit is the default or as specified in the query
    // if the query value for limit is 0 return all
    config.limit = setLimit(query, defaults);

    // sort order
    var dir = query.dir || defaults.dir || 'desc';
    config.sort = setSort(query, dir);

    return config;
}

// perform search on properties of this model
var performSearch = function(res, config, type) {
    var output = [];
    // model reference
    return sails.models[config.modelName].find()
    .where(config.query)
    .populateAll()
    .skip(config.skip)
    .limit(config.limit)
    .sort(config.sort)

    .exec(function findCB(err,found){
        if (found) {
            while (found.length) {
                var tmp = found.pop();
                // return full object for search
                if (type === 'search') {
                    output.push(tmp);
                // return selected search field and id for get
                } else {
                    var tmpObj = {}
                    tmpObj.id = tmp.id;
                    if (!config.as) {
                        // customize object property to be the searchField
                        tmpObj[config.searchField] = tmp[config.searchField];
                    } else {
                        // customize returned object property according to value from qs as property
                        tmpObj[config.as] = tmp[config.searchField];                    
                    }
                    output.push(tmpObj);
                }
            }
        }
       return res.json(output);
    });
}

var searchRelatedModel = function(res, config, searchConfig) {
    var foreignWhereQuery = {};
    foreignWhereQuery[searchConfig.via] = { contains: config.criteria };
    // returned from initial related data query
    // then reset and returned from join table
    var foreignIdArray = [];
    // Models references need to be in lowercase
    var modelRef = config.searchField.toLowerCase();
    return sails.models[modelRef].find()
        .where(foreignWhereQuery)
        .then(function(relatedDocs){
            for (var i = relatedDocs.length - 1; i >= 0; i--) {
                foreignIdArray.push(relatedDocs[i].id);
            };
            //no relatedDocs found
            if(relatedDocs === undefined) {
                return ({notFound:true});
            }
            var whereQuery = {};
            whereQuery[config.searchField] = { '$in':foreignIdArray };

            // get primary data using primaryIdArray
            return sails.models[config.modelName].find()
            .where(whereQuery)
            .populateAll()
            .then(function(found){
                return res.json(found);
            });
    });
}

var searchReleatedCollection = function (res, config, searchConfig) {
    var output = [];

    // Result from initial query is an array of ids 
    // that belong to the searched properties collection
    // Join table will be queryed using this array
    var foreignIdArray = []; 

    // Result from join/second query is an array of ids 
    // that belong to the primary collection
    var primaryIdArray = [];

    // join table config / get references to external collection and its join table
    var foreignTableName = searchConfig.collection;
    var joinTableForeignField = (searchConfig.via) ? searchConfig.via + '_' + searchConfig.via : searchConfig.collection + '_' + config.searchField;
    var joinTableModelField = config.modelName + '_' + config.searchField;

    // Check for self-join.
    var selfJoin = '';
    if (searchConfig.collection === config.modelName) {
        selfJoin = '_' + config.modelName.toLowerCase();
    }

    var joinTableName = joinTableModelField.toLowerCase() + selfJoin + '__' + joinTableForeignField.toLowerCase();
    var whereQuery = {};
    var searchVia = searchConfig.via;

    // change name to match SailsJS self-join schema.
    if (!searchVia) {
        searchVia = searchConfig.collection;
        joinTableForeignField += '_' + searchConfig.collection;
    }

    whereQuery[searchVia] = { contains: config.criteria };

    // get matching related data and ids
    // get foreign data using 
    // config.criteria
    return sails.models[foreignTableName].find()
    .where(whereQuery)
    .then(function(relatedDocs){
        for (var i = relatedDocs.length - 1; i >= 0; i--) {
            foreignIdArray.push(relatedDocs[i].id);
        };

        //no relatedDocs found
        if(relatedDocs === undefined) {
            return ({notFound:true});
        }

        // get join table data
        // with primary record
        // using foreignArray ids
        var foreignWhereQuery = {};
        foreignWhereQuery[joinTableForeignField] = foreignIdArray;
        return sails.models[joinTableName].find()
        .where(foreignWhereQuery)
        .then(function(joinData){
            for (var i = joinData.length - 1; i >= 0; i--) {
                primaryIdArray.push(joinData[i][joinTableModelField]);
            };
            // get primary data using primaryidarray
            var whereQuery = {id:{'$in':primaryIdArray}};
            return sails.models[config.modelName].find()
            .where(whereQuery)
            .populateAll()
            .then(function(found){
                return res.json(found);
            });
        });
    });
}

var arrayFromObject = function(obj) {
    var array = [];
    for (var prop in obj) {
        array.push(prop);
    }
    return array;
}

module.exports = function(defaults) {
    

    var module = {

        get: function (req, res) {
            var config = setConfig(req, defaults);
            return performSearch(res, config, 'get');           
        },

        search: function (req, res) {

            // set search criteria
            var config = setConfig(req, defaults);
            // reads fields type from model to determine search type below
            var searchConfig = config.model[config.searchField];

            // perform search on properties of this model
            if (!searchConfig.hasOwnProperty('via') && !searchConfig.hasOwnProperty('model') && !searchConfig.hasOwnProperty('collection') ) {
                performSearch(res, config, 'search');
            }

            // perform search on properties of external model
            // one to one relationship
            if (searchConfig.hasOwnProperty('model')) {
                searchRelatedModel(res, config, searchConfig);
            }

            // perform search on properties of external collection
            // one to many / many to many
            if (searchConfig.hasOwnProperty('collection')) {
                searchReleatedCollection(res, config, searchConfig);
            }
        },

        model: function(req, res) {
            var config = setConfig(req, defaults);
            // items starting with _ are  admin / configuration properties in the output object
            var array = arrayFromObject(config.model);
            // _displayOrder = creation order of properties in model definition
            config.model._displayOrder = array;
            config.model._primaryField = defaults.primaryField;
            return res.json(config.model);
        },

        displayOrder: function(req, res) {
            var config = setConfig(req, defaults);
            var array = arrayFromObject(config.model);
            return res.json(array);
        },

        // Does not work with external collections and models
        getCount: function(req, res) {
            var config = setConfig(req, defaults);
            sails.models[config.modelName].count(config.query).exec(function countCB(err, found){
                return res.json(found);
            });
        }
    }
    return module;
};