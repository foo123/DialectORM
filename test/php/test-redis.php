<?php

define('DIR', dirname(__FILE__));
include(DIR.'/../../src/php/DialectORM.php');
include(DIR.'/nosql/redis.php');

DialectNoSql::NoSqlHandler(new RedisStorage([
    'host' => '127.0.0.1',
    'port' => 6379,
    'namespace' => 'dialectorm:'
]));

class Tweet extends DialectNoSql
{
    public static $collection = 'tweets';
    public static $pk = ['id'];

    public function typeId($x)
    {
        return (int)$x;
    }

    public function typeContent($x)
    {
        return (string)$x;
    }

    public function validateContent($x)
    {
        return 0 < strlen($x);
    }
}

function output($data)
{
    if (is_array($data))
    {
        echo json_encode(array_map(function($d){return $d->toArray();}, $data), JSON_PRETTY_PRINT) . PHP_EOL;
    }
    elseif ($data instanceof DialectNoSql)
    {
        echo json_encode($data->toArray(), JSON_PRETTY_PRINT) . PHP_EOL;
    }
    else
    {
        echo ((string)$data) . PHP_EOL;
    }
}

function test()
{
    output(Tweet::fetchByPk(1));
    //$tweet = new Tweet(['content' => 'hello redis!']);
    //$tweet->setId(1);
    //$tweet->save();
    output(Tweet::fetchByPk(1));
}

test();