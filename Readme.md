# dsmc

This is a node.js command line utility that creates SailsJS base Models and Controllers for API use. 
A generic controller called _dsmcController.js will be created in the common folder of the root directory of the project.

## Installation

This utility is available on npm. Globally install it by using the **-g** flag:

```bash
npm install -g dsmc
```
#### GENERATE model and Sails controller for SailsJS api
	
	-n is the name of the model and controller.
	-f is a list of comma separated fields
	-c is a list of comma separated collections (one to many)
	-m is a list of comma separated models (one to onew)

### Examples

Make a model and controller for 'ModelName' with properties 'primaryprop', 'anotherprop' and 'thirdprop':

```bash
dsmc -n ModelName -f firstprop,secondprop,thirdprop
```

```bash
dsmc -n ModelName -f title,url,subtitle,text,author -c tag -m company
```

## Usage

To use it, `cd` into a project directory, and run `dsmc` with -n and -f args to represent model name and properties respectively.

### Notes

SailsJS expects controllers and models to be created using Pascal Case please appropriately name Models with the first character uppercase to ensure compatibility.

dsmc will write the model into the api/models/ folder.
dsmc will write the controller into the api/controllers/ folder.

Existing files will be over written.

Model properties are string by default, modify as needed.

MongoDb will add the following

	_id as a unique identifier.
	createdAt date created.
	updatedAt date last updated.

dsmc will add the following

	createdBy user that created the record.
	updatedBy user that last updated the record.

createdBy and updatedBy values must be passed to the api or will default to 'admin'

### Additional Notes

	the first field in the field list will be the default field.

#### CREATE Sails model and Sails controller EXAMPLE FROM COMMAND LINE

	dsmc -n essay -f one,two,three 

#### MODEL - Returns model definition for frontend Validation Error Checking

	http://localhost:1337/essay/model/

#### DISPLAYORDER - Returns list of fields for ordered Dynamic view presentation

	Display order is the order of the attributes in the model, reorder model attributes in the model definition as needed

	http://localhost:1337/essay/displayOrder/

#### GET - Returns ID AND PRIMARY fields for dropdowns / suggestive lists

	Returns an array of objects with id and primary field using default limit in the generated controller

	http://localhost:1337/essay/get/

	Returns an array of all objects in the collection

	http://localhost:1337/essay/get/?limit=0

	Returns id and specified field using default limit in the generated controller

	http://localhost:1337/essay/get/?field=short

	Returns the sorted results of the id and specified field using default limit in the generated controller

	http://localhost:1337/essay/get/?field=short&sort=short&dir=desc

	Returns the sorted results of the id and specified field without limit

	http://localhost:1337/essay/get/?field=short&sort=short&dir=desc&limit=0

	Returns the sorted results of the id and specified field containing ed in the field short

	http://localhost:1337/essay/get/ed?field=short&sort=short

#### SEARCH - Returns results after searching primary or specified field for string

	http://localhost:1337/newmodel/search/la?field=ObjectName

	Search string follows the slash or is named in query string as shown in the url below

	http://localhost:1337/essay/search/?field=short&search=ale&limit=200&dir=desc&searchType=endsWith

	Field string is optional and follows ?field= or the final / in the url

	Using a search string without field= will search the primary field of the object.

	Using a search string with a field name specified will search the specified field / node for the string provided.

	The default search uses contains in the query.

	&searchType=contains

	Other options are below.

	&searchType=startsWith

	&searchType=endsWith


#### LIMIT, SKIP

	Limit

		&limit=

	Skip

		&skip= 

#### SORT, DIRECTION

	&sort=sortField

	&dir=asc

	&dir=desc

