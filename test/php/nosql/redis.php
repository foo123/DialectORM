<?php

require_once(dirname(__FILE__) . '/redis_cli.php');

class RedisStorage implements IDialectORMNoSql
{
    protected $client;
    protected $keyPrefix = '';

    public function __construct($options = array())
    {
        $options = array_merge(array(
            'host' => '127.0.0.1',
            'port' => 6379,
            'namespace'=> ''
        ), $options);
        
        $this->client = new redis_cli((string)$options['host'], intval($options['port']));
        $this->keyPrefix = (string)$options['namespace'];
    }

    public function vendor()
    {
        return 'redis';
    }
    
    public function supportsPartialUpdates()
    {
        return false;
    }

    public function supportsCollectionQueries()
    {
        return false;
    }
    
    public function insert($collection, $key, $data)
    {
        $this->client->cmd('SET', $this->getKeyName($collection, $key), json_encode($data))->set();
        return 1;
    }

    public function update($collection, $key, $data)
    {
        return $this->insert($collection, $key, $data);
    }

    public function delete($collection, $key)
    {
        $this->client->cmd('UNLINK', $this->getKeyName($collection, $key))->set();
        return 1;
    }

    public function find($collection, $key)
    {
        $data = $this->client->cmd('GET', $this->getKeyName($collection, $key))->get();
        return ! $data ? null : json_decode($data, true);
    }

    public function findAll($collection, $data)
    {
        return null;
    }

    public function getKeyName($collection, $key = null)
    {
        return $this->keyPrefix . $collection . ':' . (empty($key) ? '' : implode(':', array_values((array)$key)));
    }
}