'use strict';

module.context.use('/log', require('./routes/log'), 'log');
module.context.use('/metrics', require('./routes/metrics'), 'metrics');
module.context.use('/config', require('./routes/config'), 'config');


const metricCollPrefix = "metric_";

const db = require('@arangodb').db;

const createRouter = require('@arangodb/foxx/router');
const router = createRouter();
module.context.use(router);


router.get('/', (req, res) => {
   const mt = req.context.manifest;
   res.send({ name: mt.name,
       version: mt.version,
       license: mt.license,
       description: mt.description,
       author: 'gcugli',
       code: 'https://github.com/TelcoSYS/grafana-pull-arangodb.git' });
});


router.post('/search',(req, res) => {
   const reply = [];
   db._collections().forEach((c)=>{
     var name = c.name();
     if(name.startsWith(metricCollPrefix))
       reply.push(name.substr(metricCollPrefix.length));
     });
   res.send(reply);
});


router.post('/query',(req, res) => {
   res.send({status:'Not implemented yet'});
});


router.post('/annotations',(req, res) => {
   res.send({status:'Not implemented yet'});
});



