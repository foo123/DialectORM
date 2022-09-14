"use strict";
const DialectORM = require('../../src/js/DialectORM.js');
const RedisStorage = require('./nosql/redis.js')(DialectORM.NoSql);

DialectORM.NoSql.NoSqlHandler(new RedisStorage({
    'host' : '127.0.0.1',
    'port' : 6379,
    'namespace' : 'dialectorm:'
}));

class Tweet extends DialectORM.NoSql
{
    static collection = 'tweets';
    static pk = ['id'];

    typeId(x)
    {
        return parseInt(x, 10);
    }

    typeContent(x)
    {
        return String(x);
    }

    validateContent(x)
    {
        return 0 < x.length;
    }
}

function print(x)
{
    console.log(x);
}
function output(data)
{
    if (Array.isArray(data))
        print(JSON.stringify(data.map(d => d.toObj()), null, 4));
    else if (data instanceof DialectORM.NoSql)
        print(JSON.stringify(data.toObj(), null, 4));
    else
        print(String(data));
}

async function test()
{
    output(await Tweet.fetchByPk(2));
    //let tweet = new Tweet({'content' : 'hello redis2!'});
    //tweet.setId(2);
    //await tweet.save();
    output(await Tweet.fetchByPk(2));
}

test().then(() => process.exit()).catch(e => {print(e); process.exit();});