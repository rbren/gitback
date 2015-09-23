# GitBack

## Installation

```bash
npm install --save gitback
```

## About

GitBack is a (currently experimental) attempt to use Git as a datastore for NodeJS. 
Data is stored as files (generally JSON documents) inside a Git repository, and is exposed
via a RESTful API. This may seem insane, and it many ways it is. But there are a number of positives.

We get, for free:
* A **history of every revision** to the datastore
* Easy **versioning** via branches
* The ability to **roll back** any single change, or **revert** to any point in time
* The ability to store **aribitrary data** without dealing with encoding/decoding. Images are just images, .zips are just .zips
* A **beautiful GUI** for viewing and editing the datastore, thanks to GitHub

That last point is particularly important if you want to collaborate with less-technical folks.
What would normally involve database queries can now be done in a point-and-click interface.

### Objections
* Each write will cause two separate disk writes (one locally, one in the remote)
* Concurrent writes to the same document will frequently fail
* We need to make frequent calls to ```git pull``` to keep the local repository in line with the remote
* These issues compound when using multiple replicas (e.g. for loadbalancing)

So when should you use GitBack, and when should you use a more traditional datastore?

Use GitBack if:
* You want a quick and dirty solution for storing data
* You anticipate making relatively few writes to the datastore
* You're dealing with a relatively small amount of data (as a rule of thumb, less than 100MB)
* You want non-technical people to be able to edit the datastore

DON'T use GitBack if:
* You anticipate making frequent writes to the datastore
* You anticipate many concurrent writes to the same documents
* You need to perform complex operations/queries on your data
* You need to store gigabytes of data
* You can't deal with slow writes (> 1s)
 
GitBack is great for small projects, or for getting an idea off the ground quickly.
It doesn't scale well at all, but we're working on ways to export to and sync with a
MongoDB instance.

As an example, I'm maintaining my blog using GitBack. You can
[see the repository here](https://github.com/bobby-brennan/gitback-blog)

## Usage

### Quickstart
* [Create a new repository](https://github.com/new)
* Add a collection to that repository:
**./myCollection.js**
```js
{
  access: {
    get: 'all',
    post: 'all',
  }
}
```
* Create a GitBack server with Express, passing in the URL of the repository you created.
```js
var App = require('express')();
var GitBack = require('gitback');
var DB = new GitBack({
  directory: __dirname + '/database',
  remote: "https://username:password@github.com/username/repository.git",
  refreshRate: 30000, // Check remote for changes every 30s
});
DB.initialize(function(err) {
  App.use('/api', DB.router);
});
App.listen(3000);
```
* Use it!
```bash
$ curl localhost:3000/api/myCollection -X POST -H "Content-Type: application/json" -d '{"id": "foo", "bar": "baz"}'
{"success": true}
$ curl localhost:3000/api/myCollection
[{"id": "foo", "bar": "baz"}]
```

You'll see the changes immediately reflected in the repository you created in step 1.

### Authorization

You'll need to make sure your machine has read and write access to the repository.
There are a few strategies for this:

#### Use your Username and Password
The best way to do this is to use an environment variable:
```bash
export GITBACK_REMOTE_URL="https://username:password@github.com/username/repository.git"
```
```js
var GitBack = require('gitback');
var DB = new GitBack({
  directory: __dirname + '/database',
  remote: process.env.GITBACK_REMOTE_URL,
});
```

#### Store your Git credentials
[Instructions](http://git-scm.com/docs/git-credential-store)
```js
var GitBack = require('gitback');
var DB = new GitBack({
  directory: __dirname + '/database',
  remote: 'https://github.com/username/repository.git',
});
```

#### Use Deploy Keys
Probably the most secure option. Deploy keys are specific to a particular
repository, so if they're compromised attackers won't have access to your whole account.
Be sure to enable write access.

[Instructions](https://developer.github.com/guides/managing-deploy-keys/#deploy-keys)
```js
var GitBack = require('gitback');
var DB = new GitBack({
  directory: __dirname + '/database',
  remote: 'git@github.com:username/repository.git',
});
```

### Creating the Datastore

For each collection in the datastore, we'll have:
* ```./{collection}.js``` - a file that describes the collection, e.g. it's schema and access control
* ```./{collection}/``` - a directory containing all the items in the collection
* ```./{collection}/{itemID}/``` - a directory containing the all the data for a particular item
* ```./{collection}/{itemID}/_item.json``` - the JSON describing the details of the item.

We can also associate additional data with the item by adding files to its folder.

Here's an example:

```
./
  pets.js
  pets/
    Rover/
      _item.json
      photo.png
    Spot/
      _item.json
      photo.png
```

Let's have a look at pets.js, which tells us about the collection:

**./pets.js**
```js
{
  id: "name",
  schema: {
    type: "object",
    properties: {
      name: {type: "string"},
      age: {type: "number"},
      type: {type: "string"},
      owners: {type: "array", items: {type: "string"}},
    }
    additionalProperties: false,
  },
  attachments: {
    photo: {
      extension: 'png',
      strategy: 'link',
    }
  },
  access: {
    get: "all",
    post: "all",
  },
}
```

There's a lot going on here. Let's take it field by field.
* ```id```: This specifies the field to use as a unique id for this collection. Default is 'id'.
* ```schema```: [JSON schema](http://json-schema.org/) for validating new items. You can leave this unspecified if you want to accept arbitrary JSON.
* ```attachments```: Additional files that will be stored alongside _item.json.  ```strategy``` can be one of
  * 'string' (default): GitBack will make this field a string with the contents of the file
  * 'link': GitBack will make this field a link that retrieves the file
* ```access```: GitBack will expose a RESTful API for manipulating your database. You can set access control for each HTTP verb to 'all' to grant world access, or to a function that validates the request (see 'Authentication' below). The verbs are:
  * get: retrieves objects
  * post: creates new objects
  * put: overwrites an object
  * patch: edits an object
  * delete: deletes an object

  
