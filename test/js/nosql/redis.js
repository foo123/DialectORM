"use strict";

module.exports = function( DialectNoSql ) {

var redis = null;

// requires redis node module
// https://github.com/NodeRedis/node-redis
try {
    redis = require('redis');
} catch(e) {
    redis = null;
}

function is_obj(arg)
{
    return Object.prototype.toString.call(arg) === '[object Object]';
}

class RedisStorage extends DialectNoSql.INoSql
{
    client = null;
    keyPrefix = '';

    constructor(options = {})
    {
        super();
        this.client = redis.createClient(options['port']||6379, options['host']||'127.0.0.1');
        this.keyPrefix = String(options['namespace']||'');
        this.client.on('error', function(err) { throw err; });
    }

    vendor()
    {
        return 'redis';
    }

    supportsPartialUpdates()
    {
        return false;
    }

    supportsConditionalQueries()
    {
        return false;
    }

    insert(collection, key, data)
    {
        return new Promise((resolve,reject) => {
            this.client.SET(this.getKeyName(collection, key), JSON.stringify(data), function(err, res){
                if (err) reject(err);
                else resolve(1);
            });
        });
    }

    update(collection, key, data)
    {
        return this.insert(collection, key, data);
    }

    del(collection, key)
    {
        return new Promise((resolve,reject) => {
            this.client.UNLINK(this.getKeyName(collection, key), function(err, res){
                if (err) reject(err);
                else resolve(1);
            });
        });
    }

    find(collection, key)
    {
        return new Promise((resolve,reject) => {
            this.client.GET(this.getKeyName(collection, key), function(err, data){
                if (err || !data) resolve(null);
                else resolve(JSON.parse(data));
            });
        });
    }

    findAll(collection, conditions)
    {
        return null;
    }

    getKeyName(collection, key = null)
    {
        return this.keyPrefix + String(collection) + ':' + (!key ? '' : (is_obj(key) ? Object.values(key).join(':') : String(key)));
    }
}

return RedisStorage;
};