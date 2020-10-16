<?php

class PDODb implements IDialectORMDb
{

    private $dbh = null;
    private $conf = array();
    private $vendorName = '';
    public $last_query = null;
    public $last_result = null;
    public $num_rows = 0;
    public $insert_id = '0';

    public function __construct($conf=array(), $vendor='')
    {
        $this->conf = (array)$conf;
        $this->vendorName = (string)$vendor;
        if ( !empty($conf) ) $this->connect($conf);
    }

    public function __destruct()
    {
        $this->disconnect();
        $this->conf = null;
        $this->dbh = null;
    }

    public function vendor()
    {
        return $this->vendorName;
    }

    public function escapeWillQuote()
    {
        return true;
    }

    public function escape($str)
    {
        if ( !isset($this->dbh) || !$this->dbh )
            $this->connect($this->conf);

        $stre = $this->dbh ? $this->dbh->quote($str) : ('\''.addslashes(stripslashes($str)).'\'');
        if ( false === $stre ) $stre = '\''.addslashes(stripslashes($str)).'\'';
        return $stre;
    }

    public function connect($conf=array())
    {
        // Must have a dsn and user
        $conf = array_merge(array(
            'dsn' => '',
            'user' => '',
            'password' => '',
            'ssl' => array()
        ), (array)$conf);

        if ( !$conf['dsn'] || !$conf['user'] )
            throw new Exception('DB: No dsn or user');

        $this->dbh = !empty($conf['ssl']) ? new PDO($conf['dsn'], $conf['user'], $conf['password'], $conf['ssl']) :  new PDO($conf['dsn'], $conf['user'], $conf['password']);
        $this->dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $this;
    }

    public function disconnect()
    {
        $this->dbh = null;
        return $this;
    }

    public function query($sql)
    {
        $sql = trim((string)$sql);

        // initialise return
        $this->last_query = $sql;
        $this->num_rows = 0;
        $this->insert_id = '0';
        $this->last_result = array();

        // If there is no existing database connection then try to connect
        if ( !isset($this->dbh) || !$this->dbh )
        {
            $this->connect($this->conf);
        }

        // Query was an insert, delete, update, replace
        if ( preg_match('/^(insert|delete|update|replace|drop|create|alter)\\s+/i', $sql) )
        {

            // Perform the query and log number of affected rows
            $this->num_rows = $this->dbh->exec($sql);

            // If there is an error then take note of it..
            if ( $this->catchError() ) return false;

            // Take note of the insert_id
            if ( preg_match("/^(insert|replace)\s+/i", $sql) )
            {
                $this->insert_id = (string)@$this->dbh->lastInsertId();
            }
            return array('affectedRows' => $this->num_rows, 'insertId' => $this->insert_id);
        }
        // Query was an select
        else
        {
            // Perform the query and log number of affected rows
            $sth = $this->dbh->query($sql);

            // If there is an error then take note of it..
            if ( $this->catchError() ) return false;

            // Store Query Results
            $num_rows = 0; $this->last_result = array();
            while ($row = @$sth->fetch(PDO::FETCH_ASSOC))
            {
                $this->last_result[] = $row;
                $num_rows++;
            }

            // Return number of rows selected
            $this->num_rows = $num_rows;
            return $this->last_result;
        }
    }

    public function get($sql)
    {
        return $this->query($sql);
    }

    private function catchError($throw=true)
    {
        $error_str = 'No error info';
        $err_array = $this->dbh->errorInfo();

        // Note: Ignoring error - bind or column index out of range
        if ( isset($err_array[1]) && $err_array[1] != 25)
        {
            if ( $throw )
                throw new Exception(implode(', ', $err_array).', Query: '.$this->last_query, 1);
            return true;
        }
    }
}
