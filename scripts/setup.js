'use strict';

const db = require('@arangodb').db;

if(!db._collection(module.context.collectionName("config"))) {

   //Run just one time
   const documentCollections = [
     "log",
     "metrics",
     "config"
     ,"annotations"
   ];

   for (const localName of documentCollections) {
      const qualifiedName = module.context.collectionName(localName);
      if (!db._collection(qualifiedName)) {
         db._createDocumentCollection(qualifiedName);
      } else if (module.context.isProduction) {
        console.debug(`collection ${qualifiedName} already exists. Leaving it untouched.`)
      }
   }

   for (const c of ['metric_cpu','metric_mem','metric_temp']) 
     if(!db._collection(c)){
       db._createDocumentCollection(c);
       db._query('LET now = DATE_NOW() FOR n IN 1..12000 LET tm = now - n*2*1000 INSERT { time: tm , extra:DATE_ISO8601(tm), value: RAND() } IN @@collection',{'@collection': c });
   }
   db._query('LET now = DATE_NOW() INSERT { time: now - 60*60*1000, title: "Incident #78493", timeEnd: now - 45*60*1000, isRegion:true, tags: ["docker","grafana"], text:"Service outage (Region annotation)" } INTO @@collection',{'@collection': module.context.collectionName('annotations')});

   db._query('INSERT { time:DATE_NOW() - 20*60*1000, title: "Event #78534", tags: ["docker","arango"], text:"Service outage" } INTO @@collection',{'@collection': module.context.collectionName('annotations')});

   
   console.info(module.context.mount,'collections created');
   module.exports = { msg:'collections created'};
}   

