# GitBack

## Installation

```bash
npm install --save gitback
```

## About

GitBack is a (currently experimental) attempt to use Git as a datastore for NodeJS. 
All our data is stored as files (generally JSON documents) inside a Git repository, and is exposed
via a RESTful API. This may seem insane, and it many ways it is:
* Each write will cause two separate disk writes (one locally, one in the remote)
* Concurrent writes to the same document will frequently fail
* We need to make frequent calls to ```git pull``` to keep the local repository in line with the remote
* These issues compound when using multiple replicas (e.g. for loadbalancing)

However, despite these drawbacks, there are a number of positives. We get, for free:
* A history of every revision to the datastore
* Easy versioning via branches
* The ability to roll back any single change, or revert to any point in time
* The ability to store aribitrary data **without dealing with encoding/decoding**. Images are just images, .zips are just .zips
* A beautiful GUI for viewing and editing the datastore, thanks to GitHub

That last point is particularly important if you want to collaborate with less-technical folks.
What would normally involve database queries can now be done in a point-and-click interface.

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
 
GitBack is great for small projects, or for getting an idea off the ground quicky
It doesn't scale well at all, but we're working on ways to export to and sync with a
MongoDB instance.

As an example, I'm maintaining my blog using GitBack. You can
[see the repository here](https://github.com/bobby-brennan/gitback-blog)

If I'm ever handling dozens of comments per second, or become so prolific that I have
thousands of articles to serve, I'll have to consider migrating to MongoDB. But for now,
GitBack is far and away the easiest way for me to create and maintain articles and comments.

## Usage

First you'll need to create a new repository for GitBack to store data in. You'll also need
to make sure your machine has read and write access to the repository. There are a few strategies
for this:

#### Store your Git credentials
Easy but not very secure. [Instructions](http://git-scm.com/docs/git-credential-store)
```js
var GitBack = require('gitback');
var DB = new GitBack({
  directory: __dirname + '/database',
  remote: 'https://github.com/username/repository.git',
});
```

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

#### Use Deploy Keys
Probably the most secure option. Deploy keys are specific to a particular
repository, so if they're compromised attackers won't have access to your whole account.
[Instructions](https://developer.github.com/guides/managing-deploy-keys/#deploy-keys)
```js
var GitBack = require('gitback');
var DB = new GitBack({
  directory: __dirname + '/database',
  remote: 'git@github.com:username/repository.git',
});
```
