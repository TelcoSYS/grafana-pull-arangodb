'use strict';
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const Config = require('../models/config');

const configItems = module.context.collection('config');
const keySchema = joi.string().required()
.description('The key of the config');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('config');


router.get(function (req, res) {
  res.send(configItems.all());
}, 'list')
.response([Config], 'A list of configItems.')
.summary('List all configItems')
.description(dd`
  Retrieves a list of all configItems.
`);


router.post(function (req, res) {
  const config = req.body;
  let meta;
  try {
    meta = configItems.save(config);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(config, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: config._key})
  ));
  res.send(config);
}, 'create')
.body(Config, 'The config to create.')
.response(201, Config, 'The created config.')
.error(HTTP_CONFLICT, 'The config already exists.')
.summary('Create a new config')
.description(dd`
  Creates a new config from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let config
  try {
    config = configItems.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(config);
}, 'detail')
.pathParam('key', keySchema)
.response(Config, 'The config.')
.summary('Fetch a config')
.description(dd`
  Retrieves a config by its key.
`);


router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const config = req.body;
  let meta;
  try {
    meta = configItems.replace(key, config);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(config, meta);
  res.send(config);
}, 'replace')
.pathParam('key', keySchema)
.body(Config, 'The data to replace the config with.')
.response(Config, 'The new config.')
.summary('Replace a config')
.description(dd`
  Replaces an existing config with the request body and
  returns the new document.
`);


router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let config;
  try {
    configItems.update(key, patchData);
    config = configItems.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(config);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the config with.'))
.response(Config, 'The updated config.')
.summary('Update a config')
.description(dd`
  Patches a config with the request body and
  returns the updated document.
`);


router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    configItems.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a config')
.description(dd`
  Deletes a config from the database.
`);
