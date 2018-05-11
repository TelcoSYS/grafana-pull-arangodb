'use strict';

module.context.use('/log', require('./routes/log'), 'log');
module.context.use('/metrics', require('./routes/metrics'), 'metrics');
module.context.use('/config', require('./routes/config'), 'config');


const metricCollName = module.context.collectionName('metrics');
const anttnsCollName = module.context.collectionName('annotations');

const db = require('@arangodb').db;
const cnMetrics = module.context.collection('metrics');

const stmtSearch = db._createStatement( { 
    "query": "FOR d IN @@coll FILTER NOT d.hidden RETURN d._key",
    "bindVars": { "@coll" : metricCollName }});

	

const createRouter = require('@arangodb/foxx/router');
const router = createRouter();
module.context.use(router);


module.context.use(function (req, res, next) {
   res.setHeader('Access-Control-Allow-Origin','*');
   res.setHeader('Access-Control-Allow-Methods','POST');
   res.setHeader('Access-Control-Allow-Headers','accept, content-type');
   next();
});   


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
   res.send(stmtSearch.execute().toArray());
});


router.post('/annotations',(req, res) => {
   const body = JSON.parse(req._raw.requestBody);
   const reply = [];
   console.info('anno',body);
   const ql = 'FOR d IN @@coll FILTER (d.time >= @from AND d.time <= @to) OR (d.timeEnd >= @from AND d.timeEnd <= @to) RETURN d';
   const antt = db._query(ql,{'@coll':module.context.collectionName('annotations')
          ,from: new Date(body.range.from).getTime()
	  ,to:   new Date(body.range.to).getTime() });
   while (antt.hasNext()) {
     let doc = antt.next();
     let ant = { annotation: body.annotation }
     ant.time = doc.time;
     ant.text = doc.text;
     ant.title = doc.title;
     ant.tags = doc.tags;
     if (doc.isRegion) {
        ant.isRegion = true;
	ant.timeEnd = doc.timeEnd;
     }
     reply.push(ant);
     console.info('anot',ant);
   }
   res.send(reply);
});



router.post('/query',function (req, res) {
   const body = JSON.parse(req._raw.requestBody);
   const query = {}; const reply = [];
   query.from = new Date(body.range.from).getTime();
   query.to   = new Date(body.range.to).getTime();
   query.interval = body.intervalMs;
   query.targets = body.targets;

   for (const t of body.targets) {
     if(t.type == 'timeserie') 
       reply.push(getTimeserieData(query,t));
     else if(t.type == 'table')  	
       reply.push(getTableData(query,t));
   }
   res.send(reply);
});

function getTimeserieData(q,t) {
	const mtc = cnMetrics.document(t.target);
	const dat = db._query(mtc.datapoints,
			{from:q.from,to:q.to,interval:q.interval}).toArray();
	return { target:t.target, datapoints: dat };  
}

function getTableData(q,t) {
	const mtc = cnMetrics.document(t.target);
	return { columns: mtc.columns,
			rows: mtc.rows, type:"table" };
}




