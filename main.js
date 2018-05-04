'use strict';

module.context.use('/log', require('./routes/log'), 'log');
module.context.use('/metrics', require('./routes/metrics'), 'metrics');
module.context.use('/config', require('./routes/config'), 'config');
