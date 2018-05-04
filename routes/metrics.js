'use strict';
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const Metric = require('../models/metric');

const metrics = module.context.collection('metrics');
const keySchema = joi.string().required()
.description('The key of the metric');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('metric');


router.get(function (req, res) {
  res.send(metrics.all());
}, 'list')
.response([Metric], 'A list of metrics.')
.summary('List all metrics')
.description(dd`
  Retrieves a list of all metrics.
`);


router.post(function (req, res) {
  const metric = req.body;
  let meta;
  try {
    meta = metrics.save(metric);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(metric, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: metric._key})
  ));
  res.send(metric);
}, 'create')
.body(Metric, 'The metric to create.')
.response(201, Metric, 'The created metric.')
.error(HTTP_CONFLICT, 'The metric already exists.')
.summary('Create a new metric')
.description(dd`
  Creates a new metric from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let metric
  try {
    metric = metrics.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(metric);
}, 'detail')
.pathParam('key', keySchema)
.response(Metric, 'The metric.')
.summary('Fetch a metric')
.description(dd`
  Retrieves a metric by its key.
`);


router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const metric = req.body;
  let meta;
  try {
    meta = metrics.replace(key, metric);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(metric, meta);
  res.send(metric);
}, 'replace')
.pathParam('key', keySchema)
.body(Metric, 'The data to replace the metric with.')
.response(Metric, 'The new metric.')
.summary('Replace a metric')
.description(dd`
  Replaces an existing metric with the request body and
  returns the new document.
`);


router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let metric;
  try {
    metrics.update(key, patchData);
    metric = metrics.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(metric);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the metric with.'))
.response(Metric, 'The updated metric.')
.summary('Update a metric')
.description(dd`
  Patches a metric with the request body and
  returns the updated document.
`);


router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    metrics.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a metric')
.description(dd`
  Deletes a metric from the database.
`);
