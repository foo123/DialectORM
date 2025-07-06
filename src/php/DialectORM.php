<?php
/**
*   DialectORM,
*   tiny, fast, super-simple but versatile Object-Relational-Mapper with Relationships and Object-NoSql-Mapper for PHP, JavaScript, Python
*
*   @version: 2.1.0
*   https://github.com/foo123/DialectORM
**/

if (!class_exists('DialectORM', false))
{
abstract class DialectORMEntity
{
    public static function snake_case($s, $sep = '_')
    {
        $s = preg_replace_callback('#[A-Z]#', function($m) use ($sep) {return $sep . strtolower($m[0]);}, lcfirst($s));
        return $sep === substr($s, 0, 1) ? substr($s, 1) : $s;
    }

    public static function camelCase($s, $PascalCase = false, $sep = '_')
    {
        $s = preg_replace_callback('#'.preg_quote($sep, '#').'([a-z])#', function($m) {return strtoupper($m[1]);}, $s);
        return $PascalCase ? ucfirst($s) : $s;
    }

    public static function key($k, $v, $conditions = array(), $prefix = '')
    {
        if (is_array($k))
        {
            $v = (array)$v;
            for ($i = 0, $n = count($k); $i < $n; $i++)
                $conditions[$prefix . $k[$i]] = $v[$i];
        }
        else
        {
            $conditions[$prefix . $k] = $v;
        }
        return $conditions;
    }

    public static function emptykey($k)
    {
        if (is_array($k))
            return empty($k) || (count($k) > count(array_filter($k, function($ki) {return !empty($ki);})));
        else
            return empty($k);
    }

    public static function strkey($k)
    {
        if (is_array($k))
            return implode(':&:', array_map(function($ki) {return (string)$ki;}, $k));
        else
            return (string)$k;
    }

    public static function pluck($entities, $field = '')
    {
        if ('' === $field)
        {
            return array_map(function($entity) {
                return $entity->primaryKey();
            }, $entities);
        }
        else
        {
            return array_map(function($entity) use ($field) {
                return $entity->get_($field);
            }, $entities);
        }
    }

    public static function sorter($args = array())
    {
        // Array multi - sorter utility
        // returns a sorter that can (sub-)sort by multiple (nested) fields
        // each ascending or descending independantly

        /*$args = func_get_args();*/
        // + before a (nested) field indicates ascending sorting (default),
        // example "+a.b.c"
        // - before a (nested) field indicates descending sorting,
        // example "-b.c.d"
        $l = count($args);
        if ($l)
        {
            $step = 1;
            $sorter = array();
            $variables = array();
            $sorter_args = array();
            $filter_args = array();
            for ($i = $l-1; $i >= 0; --$i)
            {
                $field = $args[$i];
                // if is array, it contains a filter function as well
                array_unshift($filter_args, '$f' . $i);
                if (is_array($field))
                {
                    array_unshift($sorter_args, $field[1]);
                    $field = $field[0];
                }
                else
                {
                    array_unshift($sorter_args, null);
                }
                $field = (string)$field;
                $dir = substr($field, 0, 1);
                if ('-' === $dir)
                {
                    $desc = true;
                    $field = substr($field, 1);
                }
                elseif ('+' === $dir)
                {
                    $desc = false;
                    $field = substr($field, 1);
                }
                else
                {
                    // default ASC
                    $desc = false;
                }
                $field = strlen($field) ? implode('', array_map(function($f) {return !strlen($f) ? '' : (preg_match('#^\\d+$#', $f) ? ('['.$f.']') : ('->get(\''.$f.'\')'));}, explode('.', $field)))/*'["' . implode('"]["', explode('.', $field)) . '"]'*/ : '';
                $a = '$a'.$field; $b = '$b'.$field;
                if ($sorter_args[0])
                {
                    $a = 'call_user_func(' . $filter_args[0] . ',' . $a . ')';
                    $b = 'call_user_func(' . $filter_args[0] . ',' . $b . ')';
                }
                $avar = '$a_'.$i; $bvar = '$b_'.$i;
                array_unshift($variables, ''.$avar.'='.$a.';'.$bvar.'='.$b.';');
                $lt = $desc ? (''.$step) : ('-'.$step); $gt = $desc ? ('-'.$step) : (''.$step);
                array_unshift($sorter, "(".$avar." < ".$bvar." ? ".$lt." : (".$avar." > ".$bvar." ? ".$gt." : 0))");
                $step <<= 1;
            }
            // use actual php anonynous function/closure
            $sorter_factory = eval('return function('.implode(',',$filter_args).'){'.implode("\n", array(
                '$sorter = function($a,$b) use('.implode(',',$filter_args).') {',
                '    '.implode("\n", $variables).'',
                '    return '.implode('+', $sorter).';',
                '};',
                'return $sorter;'
            )).'};');
            return call_user_func_array($sorter_factory, $sorter_args);
        }
        else
        {
            $a = '$a'; $b = '$b'; $lt = '-1'; $gt = '1';
            $sorter = "".$a." < ".$b." ? ".$lt." : (".$a." > ".$b." ? ".$gt." : 0)";
            return eval('return function($a,$b){return '.$sorter.';};');
        }
    }

    public static $pk = null;

    public static function fetchByPk($id, $default = null)
    {
        return $default;
    }

    public static function fetchAll($options = array(), $default = array())
    {
        return $default;
    }

    public function primaryKey($default = 0)
    {
        return $this->get_(static::$pk, $default);
    }

    public function get_($field, $default = null)
    {
        return $default;
    }

    public function get($field, $default = null, $options = array())
    {
        return $default;
    }

    public function set($field, $val = null, $options = array())
    {
        return $this;
    }

    public function has($field)
    {
        return false;
    }

    public function clear()
    {
        $this->data = null;
        $this->isDirty = null;
        return $this;
    }

    public function toArray($diff = false)
    {
        return array();
    }

    public function beforeSave()
    {
    }

    public function afterSave($result = 0)
    {
    }

    public function save($options = array())
    {
        return 0;
    }

    public function delete($options = array())
    {
        return 0;
    }
}

interface IDialectORMDb
{
    public function vendor();
    public function query($sql);
    public function get($sql);
}

class DialectORMException extends Exception
{
}

class DialectORMRelation
{
    public $type = '';
    public $a = null;
    public $b = null;
    public $ab = null;
    public $keya = null;
    public $keyb = null;
    public $field = null;
    public $data = false;

    public function __construct($type, $a, $b, $kb, $ka = null, $ab = null)
    {
        $this->type = strtolower((string)$type);
        $this->a = $a;
        $this->b = $b;
        $this->keya = $ka;
        $this->keyb = $kb;
        $this->ab = $ab;
        $this->data = false;
    }
}

// https://en.wikipedia.org/wiki/Entity%E2%80%93attribute%E2%80%93value_model
class DialectORMEAV
{
    public $tbl = null;
    public $fk = null;
    public $pk = null;
    public $key = null;
    public $val = null;
    public $data = null;
    public $isDirty = null;
    public $isDeleted = null;
    public $entitykey = null;
    private $_loaded = false;

    public function __construct($tbl, $fk, $pk, $key, $val)
    {
        $this->tbl = (string)$tbl;
        $this->fk = (string)(is_array($fk) ? $fk[0] : $fk);
        $this->pk = (string)(is_array($pk) ? $pk[0] : $pk);
        $this->key = (string)$key;
        $this->val = (string)$val;
        $this->data = array();
        $this->isDirty = array();
        $this->isDeleted = array();
        $this->entitykey = null;
        $this->_loaded = false;
    }

    public function populate($data)
    {
        if (is_array($data) && !empty($data))
        {
            $is_from_db = true;
            foreach ($data as $entry)
            {
                $entry = (array)$entry;
                if (!isset($entry[$this->key])) continue;
                $key = (string)$entry[$this->key];
                $this->data[$key] = $entry;
                if (!isset($entry[$this->pk]) || DialectORM::emptykey($entry[$this->pk]))
                {
                    $this->isDirty[$key] = true;
                    $is_from_db = false;
                }
                if (isset($entry[$this->fk]) && !DialectORM::emptykey($entry[$this->fk]))
                {
                    if (empty($this->entitykey))
                    {
                        $this->entitykey = $entry[$this->fk];
                    }
                    elseif (strval($this->entitykey) !== strval($entry[$this->fk]))
                    {
                        throw new DialectORMException('DialectORMEAV different EntityKey in data from the same entity', 1);
                    }
                }
            }
            if (!$this->_loaded) $this->_loaded = $is_from_db;
        }
        return $this;
    }

    public function entity($entitykey = null)
    {
        if ($entitykey instanceof DialectORM) $entitykey = $entitykey->primaryKey();
        $this->entitykey = is_array($entitykey) ? $entitykey[0] : $entitykey;
        return $this;
    }

    public function clear()
    {
        $this->data = array();
        $this->isDirty = array();
        $this->isDeleted = array();
        $this->_loaded = false;
        return $this;
    }

    public function get_($key, $default = null)
    {
        $key = (string)$key;
        return !empty($this->data[$key]) ? $this->data[$key] : $default;
    }

    public function get($key, $default = null)
    {
        $res = false;
        $key = (string)$key;
        if (!isset($this->data[$key]))
        {
            if (!$this->_loaded)
            {
                // lazy load
                $this->_loaded = true;
                $this->load(); // load all
                //$this->load(empty($this->data) ? null : array($key)); // initially load all
                if (!isset($this->data[$key])) $this->data[$key] = false;
            }
            else
            {
                $this->data[$key] = false;
            }
        }
        $res = $this->data[$key];
        return false === $res ? $default : $res;
    }

    public function set($key, $val)
    {
        $key = (string)$key;
        if (is_null($val))
        {
            // unset
            if (isset($this->data[$key]) && ($this->data[$key]))
            {
                $entry = $this->data[$key];
                if (isset($entry[$this->pk]) && (!DialectORM::emptykey($entry[$this->pk])))
                {
                    $this->isDeleted[$key] = $entry[$this->pk];
                }
                unset($this->data[$key]);
                if (isset($this->isDirty[$key])) unset($this->isDirty[$key]);
            }
        }
        else
        {
            // set
            if (isset($this->data[$key]))
            {
                if (!$this->data[$key])
                {
                    $this->data[$key] = array();
                    $this->data[$key][$this->key] = $key;
                }
                if (!isset($this->data[$key][$this->val]))
                {
                    $this->data[$key][$this->val] = $val;
                    $this->isDirty[$key] = true;
                }
                else
                {
                    $prev = $this->data[$key][$this->val];
                    if ($prev !== $val)
                    {
                        $this->data[$key][$this->val] = $val;
                        $this->isDirty[$key] = true;
                    }
                }
            }
            else
            {
                $this->data[$key] = array();
                $this->data[$key][$this->key] = $key;
                $this->data[$key][$this->val] = $val;
                $this->isDirty[$key] = true;
            }
            if (isset($this->isDeleted[$key]))
            {
                $this->data[$key][$this->pk] = $this->isDeleted[$key];
                unset($this->isDeleted[$key]);
            }
        }
        return $this;
    }

    public function load($keys = null)
    {
        if (!DialectORM::emptykey($this->entitykey))
        {
            $conditions = array();
            $conditions[$this->fk] = $this->entitykey;
            if (!is_null($keys)) $conditions[$this->key] = array('in'=>(array)$keys);
            // load efficiently
            $this->populate(DialectORM::DBHandler()->get(
                DialectORM::SQLBuilder()->clear()
                ->Select('*')
                ->From(DialectORM::tbl($this->tbl))
                ->Where($conditions)
                ->sql()
            ));
        }
        return $this;
    }

    public function update($keys = null)
    {
        $res = 0;
        if (!empty($this->isDirty))
        {
            $keys = is_null($keys) ? array_keys($this->isDirty) : (array)$keys;
            if (!empty($keys))
            {
                $pk = $this->pk;
                $fk = $this->fk;
                $key = $this->key;
                $val = $this->val;
                $fields = array($pk, $fk, $key, $val);
                $entitykey = DialectORM::emptykey($this->entitykey) ? null : $this->entitykey;
                $ids = array();
                $update = array();
                $insert = array();
                foreach ($keys as $k)
                {
                    $k = (string)$k;
                    if (!isset($this->data[$k]) || !$this->data[$k] || empty($this->isDirty[$k])) continue;
                    $d = $this->data[$k];
                    $id = isset($d[$pk]) ? $d[$pk] : null;
                    if (!is_null($id) && !DialectORM::emptykey($id))
                    {
                        $v = (string)$d[$val];
                        $upd = array();
                        $upd[$v] = array();
                        $upd[$v][$pk] = $id;
                        $update[] = $upd;
                        $ids[] = $id;
                        unset($this->isDirty[$k]);
                    }
                    elseif (!empty($entitykey))
                    {
                        $insert[] = array_map(function($f) use ($d,$fk,$entitykey) {return $f===$fk ? $entitykey : (isset($d[$f]) ? $d[$f] : null);}, $fields);
                        unset($this->isDirty[$k]);
                    }
                }
                if (!empty($insert))
                {
                    // find if already existing
                    $conditions = array();
                    $conditions[$fk] = $entitykey;
                    $conditions[$key] = array('in'=>array_map(function($ins) {return $ins[2/*key*/];}, $insert));
                    $existing = DialectORM::DBHandler()->get(
                        DialectORM::SQLBuilder()->clear()
                        ->Select('*')
                        ->From(DialectORM::tbl($this->tbl))
                        ->Where($conditions)
                        ->sql()
                    );
                    if (!empty($existing))
                    {
                        $map = array();
                        foreach ($insert as $entry) $map[(string)$entry[$key]] = $entry;
                        foreach ($existing as $entry)
                        {
                            $k = (string)$entry[$key];
                            if (strval($entry[$val]) !== strval($map[$k][3]))
                            {
                                $id = $entry[$pk];
                                $v = (string)$entry[$val];
                                $upd = array();
                                $upd[$v] = array();
                                $upd[$v][$pk] = $id;
                                $update[] = $upd;
                                $ids[] = $id;
                            }
                            unset($map[$k]);
                        }
                        $insert = array_values($map);
                    }
                }
                if (!empty($update))
                {
                    // update efficiently
                    $upd = array();
                    $upd[$val] = array('case'=>$update);
                    $conditions = array();
                    $conditions[$pk] = array('in'=>$ids);
                    $r = DialectORM::DBHandler()->query(
                        DialectORM::SQLBuilder()->clear()
                        ->Update(DialectORM::tbl($this->tbl))
                        ->Set($upd)
                        ->Where($conditions)
                        ->sql()
                    );
                    $res += $r['affectedRows'];
                }
                if (!empty($insert))
                {
                    // insert efficiently
                    $r = DialectORM::DBHandler()->query(
                        DialectORM::SQLBuilder()->clear()
                        ->Insert(DialectORM::tbl($this->tbl), $fields)
                        ->Values($insert)
                        ->sql()
                    );
                    $res += $r['affectedRows'];
                    $conditions = array();
                    $conditions[$fk] = $entitykey;
                    $conditions[$key] = array('in'=>array_map(function($ins) {return $ins[2/*key*/];}, $insert));
                    $r = DialectORM::DBHandler()->get(
                        DialectORM::SQLBuilder()->clear()
                        ->Select(array($pk, $key))
                        ->From(DialectORM::tbl($this->tbl))
                        ->Where($conditions)
                        ->sql()
                    );
                    foreach ($r as $_)
                    {
                        $this->data[$_[$key]][$pk] = $_[$pk];
                    }
                }
            }
        }
        return $res;
    }

    public function delete($keys = null)
    {
        $res = 0;
        if (!empty($this->data))
        {
            $pk = $this->pk;
            $keys = is_null($keys) ? array_merge(array_keys($this->data),array_keys($this->isDeleted)) : (array)$keys;
            if (!empty($keys))
            {
                $ids = array();
                foreach ($keys as $k)
                {
                    $k = (string)$k;
                    if (isset($this->isDeleted[$k]))
                    {
                        $ids[] = $this->isDeleted[$k];
                        unset($this->isDeleted[$k]);
                    }
                    else
                    {
                        if (!isset($this->data[$k]) || !$this->data[$k]) continue;
                        $d = $this->data[$k];
                        $id = isset($d[$pk]) ? $d[$pk] : null;
                        if (!is_null($id) && !DialectORM::emptykey($id)) $ids[] = $id;
                        unset($this->data[$k]);
                        if (isset($this->isDirty[$k])) unset($this->isDirty[$k]);
                    }
                }
                if (!empty($ids))
                {
                    // delete efficiently
                    $conditions = array();
                    $conditions[$pk] = array('in'=>$ids);
                    $r = DialectORM::DBHandler()->query(
                        DialectORM::SQLBuilder()
                            ->clear()
                            ->Delete()
                            ->From(DialectORM::tbl($this->tbl))
                            ->Where($conditions)
                            ->sql()
                    );
                    $res = $r['affectedRows'];
                }
            }
        }
        return $res;
    }

    public function save()
    {
        $res = 0;
        $res += $this->delete(array_keys($this->isDeleted));
        $res += $this->update(array_keys($this->isDirty));
        return $res;
    }
}

class DialectORM extends DialectORMEntity
{
    const VERSION = '2.1.0';

    protected static $deps = array();
    protected static $dbh = null;
    protected static $tblprefix = '';

    public static $table = null;
    public static $fields = array();
    public static $extra_fields = null;
    public static $relationships = array();

    private $_db = null;
    private $_sql = null;

    private $data = null;
    private $isDirty = null;
    private $relations = array();
    private $eav = null;

    public static function dependencies($deps)
    {
        DialectORM::$deps = array_merge(DialectORM::$deps, (array)$deps);
    }

    public static function dependency($dep, $default = null)
    {
        return isset(DialectORM::$deps[$dep]) ? DialectORM::$deps[$dep] : $default;
    }

    public static function DBHandler($db = null)
    {
        if (func_num_args())
        {
            if (!($db instanceof IDialectORMDb))
                throw new DialectORMException('DialectORM DB must implement IDialectORMDb', 1);
            DialectORM::$dbh = $db;
        }
        return DialectORM::$dbh;
    }

    public static function SQLBuilder()
    {
        $sqlBuilder = 'Dialect';
        $entry = DialectORM::dependency('Dialect');
        if (!empty($entry) && is_array($entry))
        {
            // Dialect may be overriden, eg a subclass of Dialect
            if (!empty($entry[1])) $sqlBuilder = $entry[1];
            $entry = $entry[0];
        }
        if (!class_exists($sqlBuilder, false))
        {
            if (!empty($entry)) @include($entry);
        }
        $db = DialectORM::DBHandler();
        $sql = new $sqlBuilder($db->vendor());
        if (method_exists($db, 'escape'))
        {
            $sql->escape(array($db, 'escape'), method_exists($db, 'escapeWillQuote') ? $db->escapeWillQuote() : false);
        }
        if (method_exists($db, 'escapeId'))
        {
            $sql->escapeId(array($db, 'escapeId'), method_exists($db, 'escapeIdWillQuote') ? $db->escapeIdWillQuote() : false);
        }
        return $sql;
    }

    public static function prefix($prefix = null)
    {
        if (func_num_args()) DialectORM::$tblprefix = (string)$prefix;
        return DialectORM::$tblprefix;
    }

    public static function tbl($table)
    {
        return DialectORM::prefix() . $table;
    }

    public static function eq($a, $b)
    {
        // handles array equivalence as well
        return $a === $b;
    }

    public static function conditions($conditions, $sql)
    {
        $table = static::$table;
        $pk = static::$pk;
        $fields = array_merge(static::$fields, array_keys(static::$relationships));
        $extra_fields = static::$extra_fields;
        $j = 0; $jc = 0; $jj = array();
        $joinConditions = function($conditions) use (&$joinConditions, &$jj, &$j, &$jc, $table, $pk, $fields, $extra_fields, $sql) {
            $conditions2 = array();
            foreach ($conditions as $f => $cond)
            {
                if (isset($cond['or']))
                {
                    $cases = array();
                    foreach ((array)$cond['or'] as $or_cl)
                    {
                        $cases[] = $joinConditions($or_cl);
                    }
                    $conditions2[$f] = array('or'=>$cases);
                    continue;
                }
                if (isset($cond['and']))
                {
                    $cases = array();
                    foreach ((array)$cond['and'] as $and_cl)
                    {
                        $cases[] = $joinConditions($and_cl);
                    }
                    $conditions2[$f] = array('and'=>$cases);
                    continue;
                }
                $ref = DialectRef::parse($f, $sql);
                $field = $ref->_col;
                if (in_array($field, $fields))
                {
                    $conditions2[$f] = $cond;
                    continue;
                }
                $eav_key = $extra_fields[3];
                $eav_value = $extra_fields[4];
                if (!isset($jj[$field]))
                {
                    $jj[$field] = ++$j;
                    $main_table = DialectORM::tbl($table);
                    $main_id = is_array($pk) ? $pk[0] : $pk;
                    $join_table = DialectORM::tbl($extra_fields[0]);
                    $join_id = is_array($extra_fields[1]) ? $extra_fields[1][0] : $extra_fields[1];
                    $join_alias = $join_table.strval($jj[$field]);
                    $sql->Join(
                        "{$join_table} AS {$join_alias}",
                        "{$main_table}.{$main_id}={$join_alias}.{$join_id}",
                        "inner"
                    );
                }
                else
                {
                    $join_alias = DialectORM::tbl($extra_fields[0]).$jj[$field];
                }
                $cases1 = array();
                $cases1[$join_alias.'.'.$eav_key] = $field;
                $cases2 = array();
                $cases2[$join_alias.'.'.$eav_value] = $cond;
                $conditions2[$join_alias.'_'.strval(++$jc)] = array('and'=>array($cases1,$cases2));
            }
            return $conditions2;
        };
        return empty($extra_fields) ? $conditions : $joinConditions($conditions);
    }

    public static function fetchByPk($id, $default = null)
    {
        $entity = DialectORM::DBHandler()->get(
            DialectORM::SQLBuilder()
                ->clear()
                ->Select(static::$fields)
                ->From(DialectORM::tbl(static::$table))
                ->Where(DialectORM::key(static::$pk, $id, array()))
                ->sql()
        );
        return !empty($entity) ? new static(isset($entity[0]) && is_array($entity[0]) ? (array)$entity[0] : (array)$entity) : $default;
    }

    public static function count($options = array())
    {
        $options = array_merge(array(
            'conditions' => array(),
        ), (array)$options);

        $sql = DialectORM::SQLBuilder()
            ->clear()
            ->Select('COUNT(*) AS cnt')
            ->From(DialectORM::tbl(static::$table))
        ;

        $res = DialectORM::DBHandler()->get($sql->Where(static::conditions($options['conditions'], $sql))->sql());
        return $res[0]['cnt'];
    }

    public static function fetchAll($options = array(), $default = array())
    {
        $options = array_merge(array(
            'conditions' => array(),
            'order' => array(),
            'limit' => null,
            'single' => false,
            'withRelated' => array(),
            'related' => array(),
            //'default' => array(),
        ), (array)$options);

        $retSingle = !empty($options['single']);
        //$default = $options['default'];
        if ($retSingle && empty($default))
            $default = null;

        $pk = static::$pk;
        $table = DialectORM::tbl(static::$table);
        $sql = DialectORM::SQLBuilder()
            ->clear()
            ->Select(array_map(function($field) use ($table) {return $table.'.'.$field.' AS '.$field;}, static::$fields))
            ->From($table)
        ;
        $sql->Where(static::conditions($options['conditions'], $sql));
        if (!empty($options['order']))
        {
            foreach ($options['order'] as $field => $dir)
                $sql->Order($field, $dir);
        }
        if (!empty($options['limit']))
        {
            if (is_array($options['limit']))
                $sql->Limit($options['limit'][0], isset($options['limit'][1])?$options['limit'][1]:0);
            else
                $sql->Limit($options['limit'], 0);
        }
        elseif ($retSingle)
        {
            $sql->Limit(1, 0);
        }

        $entities = DialectORM::DBHandler()->get($sql->sql());

        if (empty($entities)) return $default;

        if (!empty(static::$extra_fields))
        {
            // eager optimised (no N+1 issue) loading of EAV extra fields
            $ids = array_map(function($entry) use ($pk) {return $entry[is_array($pk) ? $pk[0] : $pk];}, $entities);
            $fk = is_array(static::$extra_fields[1]) ? static::$extra_fields[1][0] : static::$extra_fields[1];
            $conditions = array();
            $conditions[$fk] = array('in'=>$ids);
            $eav = DialectORM::DBHandler()->get($sql->clear()->Select('*')->From(DialectORM::tbl(static::$extra_fields[0]))->Where($conditions)->sql());
            foreach ($entities as $i => $e) $entities[$i] = new static($e, array_filter($eav, function($entry) use ($fk,$ids,$i) {return strval($entry[$fk]) === strval($ids[$i]);}));
        }
        else
        {
            foreach ($entities as $i => $e) $entities[$i] = new static($e);
        }

        if (!empty($options['withRelated']))
        {
            // eager optimised (no N+1 issue) loading of selected relations
            $ids = static::pluck($entities);
            foreach ($options['withRelated'] as $field)
            {
                if (!isset(static::$relationships[$field])) continue;
                $rel = static::$relationships[$field];
                $type = strtolower($rel[0]); $class = $rel[1];
                $conditions = array();
                switch ($type)
                {
                    case 'hasone':
                        $fk = $rel[2];
                        if (is_array($fk))
                        {
                            $conditions[DialectORM::strkey($fk)] = array('or'=>array_map(function($id) use ($fk) {
                                return DialectORM::key($fk, $id, array());
                            }, $ids));
                        }
                        else
                        {
                            $conditions[$fk] = array('in'=>$ids);
                        }
                        if (isset($options['related'][$field]['conditions']))
                            $conditions = array_merge($options['related'][$field]['conditions'], $conditions);
                        $rentities = $class::fetchAll(array(
                            'conditions' => $conditions
                        ));
                        $map = array();
                        foreach ($rentities as $re)
                        {
                            $map[DialectORM::strkey($re->get_($fk))] = $re;
                        }
                        foreach ($entities as $e)
                        {
                            $kv = DialectORM::strkey($e->primaryKey());
                            $e->set($field, isset($map[$kv]) ? $map[$kv] : null);
                        }
                        break;
                    case 'hasmany':
                        $fk = $rel[2];
                        if (isset($options['related'][$field]['limit']))
                        {
                            $sql = DialectORM::SQLBuilder();
                            $selects = array();
                            foreach ($ids as $id)
                            {
                                $conditions = DialectORM::key($fk, $id, array());
                                if (isset($options['related'][$field]['conditions']))
                                    $conditions = array_merge($options['related'][$field]['conditions'], $conditions);

                                $subquery = $sql->subquery()
                                    ->Select($class::$fields)
                                    ->From(DialectORM::tbl($class::$table))
                                    ->Where($conditions)
                                ;
                                if (!empty($options['related'][$field]['order']))
                                {
                                    foreach ($options['related'][$field]['order'] as $ofield => $dir)
                                        $subquery->Order($ofield, $dir);
                                }
                                if (is_array($options['related'][$field]['limit']))
                                    $subquery->Limit($options['related'][$field]['limit'][0], isset($options['related'][$field]['limit'][1])?$options['related'][$field]['limit'][1]:0);
                                else
                                    $subquery->Limit($options['related'][$field]['limit'], 0);

                                $selects[] = $subquery->sql();
                            }
                            $rentities = DialectORM::DBHandler()->get($sql->clear()->Union($selects, false)->sql());
                            foreach ($rentities as $i => $re) $rentities[$i] = new $class($re);
                        }
                        else
                        {
                            $conditions = array();
                            if (is_array($fk))
                            {
                                $conditions[DialectORM::strkey($fk)] = array('or'=>array_map(function($id) use ($fk) {
                                    return DialectORM::key($fk, $id, array());
                                }, $ids));
                            }
                            else
                            {
                                $conditions[$fk] = array('in'=>$ids);
                            }
                            if (isset($options['related'][$field]['conditions']))
                                $conditions = array_merge($options['related'][$field]['conditions'], $conditions);
                            $rentities = $class::fetchAll(array(
                                'conditions' => $conditions,
                                'order' => isset($options['related'][$field]['order']) ? $options['related'][$field]['order'] : array()
                            ));
                        }
                        $map = array();
                        foreach ($rentities as $re)
                        {
                            $fkv = DialectORM::strkey($re->get_($fk));
                            if (!isset($map[$fkv])) $map[$fkv] = array($re);
                            else $map[$fkv][] = $re;
                        }
                        foreach ($entities as $e)
                        {
                            $kv = DialectORM::strkey($e->primaryKey());
                            $e->set($field, isset($map[$kv]) ? $map[$kv] : array());
                        }
                        break;
                    case 'belongsto':
                        $fk = $rel[2];
                        $rpk = $class::$pk;
                        $fids = static::pluck($entities, $fk);
                        if (is_array($rpk))
                        {
                            $conditions[DialectORM::strkey($rpk)] = array('or'=>array_map(function($id) use ($rpk) {
                                return DialectORM::key($rpk, $id, array());
                            }, $fids));
                        }
                        else
                        {
                            $conditions[$rpk] = array('in'=>$fids);
                        }
                        if (isset($options['related'][$field]['conditions']))
                            $conditions = array_merge($options['related'][$field]['conditions'], $conditions);
                        $rentities = $class::fetchAll(array(
                            'conditions' => $conditions,
                        ));
                        $map = array();
                        foreach ($rentities as $re)
                        {
                            $map[DialectORM::strkey($re->primaryKey())] = $re;
                        }
                        foreach ($entities as $e)
                        {
                            $fkv = DialectORM::strkey($e->get_($fk));
                            $e->set($field, isset($map[$fkv]) ? $map[$fkv] : null, array('recurse'=>true,'merge'=>true));
                        }
                        break;
                    case 'belongstomany':
                        $ab = DialectORM::tbl($rel[4]);
                        $fk = $rel[2];
                        $pk2 = $rel[3];
                        $rpk = $class::$pk;
                        if (is_array($pk2))
                        {
                            $conditions[DialectORM::strkey($pk2)] = array('or'=>array_map(function($id) use ($pk2) {
                                return DialectORM::key($pk2, $id, array());
                            }, $ids));
                        }
                        else
                        {
                            $conditions[$pk2] = array('in'=>$ids);
                        }
                        $reljoin = DialectORM::DBHandler()->get(
                            DialectORM::SQLBuilder()
                                ->clear()
                                ->Select('*')
                                ->From($ab)
                                ->Where($conditions)
                                ->sql()
                        );
                        $fids = array_map(is_array($fk) ? function($d) use ($fk) {return array_map(function($k) use ($d) {return $d[$k];}, $fk);} : function($d) use ($fk) {return $d[$fk];}, $reljoin);
                        if (!empty($fids) && isset($options['related'][$field]['limit']))
                        {
                            $sql = DialectORM::SQLBuilder();
                            $selects = array();
                            foreach ($fids as $id)
                            {
                                $conditions = DialectORM::key($rpk, $id, array());
                                if (isset($options['related'][$field]['conditions']))
                                    $conditions = array_merge($options['related'][$field]['conditions'], $conditions);

                                $subquery = $sql->subquery()
                                    ->Select($class::$fields)
                                    ->From(DialectORM::tbl($class::$table))
                                    ->Where($conditions)
                                ;
                                if (!empty($options['related'][$field]['order']))
                                {
                                    foreach($options['related'][$field]['order'] as $ofield => $dir)
                                        $subquery->Order($ofield, $dir);
                                }
                                if (is_array($options['related'][$field]['limit']))
                                    $subquery->Limit($options['related'][$field]['limit'][0], isset($options['related'][$field]['limit'][1])?$options['related'][$field]['limit'][1]:0);
                                else
                                    $subquery->Limit($options['related'][$field]['limit'], 0);

                                $selects[] = $subquery->sql();
                            }
                            $rentities = DialectORM::DBHandler()->get($sql->clear()->Union($selects, false)->sql());
                            foreach ($rentities as $i => $re) $rentities[$i] = new $class($re);
                        }
                        else
                        {
                            $conditions = array();
                            if (is_array($rpk))
                            {
                                $conditions[DialectORM::strkey($rpk)] = array('or'=>array_map(function($id) use ($rpk) {
                                    return DialectORM::key($rpk, $id, array());
                                }, $fids));
                            }
                            else
                            {
                                $conditions[$rpk] = array('in'=>$fids);
                            }
                            if (isset($options['related'][$field]['conditions']))
                                $conditions = array_merge($options['related'][$field]['conditions'], $conditions);
                            $rentities = $class::fetchAll(array(
                                'conditions' => $conditions,
                                'order' => isset($options['related'][$field]['order']) ? $options['related'][$field]['order'] : array()
                            ));
                        }
                        $map = array();
                        foreach ($rentities as $re)
                        {
                            $map[DialectORM::strkey($re->primaryKey())] = $re;
                        }
                        $relmap = array();
                        foreach ($reljoin as $d)
                        {
                            $k1 = DialectORM::strkey(is_array($pk2) ? array_map(function($k) use ($d) {return $d[$k];}, $pk2) : $d[$pk2]);
                            $k2 = DialectORM::strkey(is_array($fk) ? array_map(function($k) use ($d) {return $d[$k];}, $fk) : $d[$fk]);
                            if (isset($map[$k2]))
                            {
                                if (!isset($relmap[$k1])) $relmap[$k1] = array($map[$k2]);
                                else $relmap[$k1][] = $map[$k2];
                            }
                        }
                        foreach ($entities as $e)
                        {
                            $k1 = DialectORM::strkey($e->primaryKey());
                            $e->set($field, !empty($relmap[$k1]) ? $relmap[$k1] : array());
                        }
                        break;
                }
            }
        }

        return $retSingle ? $entities[0] : $entities;
    }

    public static function deleteAll($options = array())
    {
        $options = array_merge(array(
            'conditions' => array(),
            'limit' => null,
            'withRelated' => false,
        ), (array)$options);

        $ids = null;
        if (!empty($options['withRelated']))
        {
            $ids = static::pluck(static::fetchAll(array('conditions'=>$options['conditions'], 'limit'=>$options['limit'])));
            if (!empty(static::$extra_fields))
            {
                $conditions = array();
                $conditions[is_array(static::$extra_fields[1]) ? static::$extra_fields[1][0] : static::$extra_fields[1]] = array('in'=>$ids);
                DialectORM::DBHandler()->query(
                    DialectORM::SQLBuilder()
                        ->clear()
                        ->Delete()
                        ->From(DialectORM::tbl(static::$extra_fields[0]))
                        ->Where($conditions)
                        ->sql()
                );
            }
            foreach (static::$relationships as $field => $rel)
            {
                $type = strtolower($rel[0]); $class = $rel[1];
                $conditions = array();
                if ('belongsto' === $type)
                {
                    // bypass
                    continue;
                }
                elseif ('belongstomany' === $type)
                {
                    // delete relation from junction table
                    $fk = $rel[3];
                    if (is_array($fk))
                    {
                        $conditions[DialectORM::strkey($fk)] = array('or'=>array_map(function($id) use ($fk) {
                            return DialectORM::key($fk, $id, array());
                        }, $ids));
                    }
                    else
                    {
                        $conditions[$fk] = array('in'=>$ids);
                    }
                    DialectORM::DBHandler()->query(
                        DialectORM::SQLBuilder()
                            ->clear()
                            ->Delete()
                            ->From(DialectORM::tbl($rel[4]))
                            ->Where($conditions)
                            ->sql()
                    );
                }
                else
                {
                    $fk = $rel[2];
                    if (is_array($fk))
                    {
                        $conditions[DialectORM::strkey($fk)] = array('or'=>array_map(function($id) use ($fk) {
                            return DialectORM::key($fk, $id, array());
                        }, $ids));
                    }
                    else
                    {
                        $conditions[$fk] = array('in'=>$ids);
                    }
                    $class::deleteAll(array(
                        'conditions' => $conditions,
                        'withRelated' => true
                    ));
                }
            }
        }
        if (is_array($ids))
        {
            $pk = static::$pk;
            $conditions = array();
            if (is_array($pk))
            {
                $conditions[DialectORM::strkey($pk)] = array('or'=>array_map(function($id) use ($pk) {
                    return DialectORM::key($pk, $id, array());
                }, $ids));
            }
            else
            {
                $conditions[$pk] = array('in'=>$ids);
            }
            $sql = DialectORM::SQLBuilder()
                ->clear()
                ->Delete()
                ->From(DialectORM::tbl(static::$table))
                ->Where($conditions)
            ;
        }
        else
        {
            $sql = DialectORM::SQLBuilder()
                ->clear()
                ->Delete()
                ->From(DialectORM::tbl(static::$table))
            ;
            $sql->Where(static::conditions($options['conditions'], $sql));
            if (!empty($options['limit']))
            {
                if (is_array($options['limit']))
                    $sql->Limit($options['limit'][0], isset($options['limit'][1])?$options['limit'][1]:0);
                else
                    $sql->Limit($options['limit'], 0);
            }
        }
        $res = DialectORM::DBHandler()->query($sql->sql());
        $res = $res['affectedRows'];
        return $res;
    }

    public function __construct($data = array(), $extra = null)
    {
        $this->relations = array();
        if (is_array($data) && !empty($data))
        {
            $this->_populate($data);
        }
        if (!empty(static::$extra_fields))
        {
            $this->eav = new DialectORMEAV(static::$extra_fields[0], static::$extra_fields[1], static::$extra_fields[2], static::$extra_fields[3], static::$extra_fields[4]);
            if (is_array($extra) && !empty($extra))
            {
                $this->eav->populate($extra);
            }
        }
    }

    public function db()
    {
        if (!$this->_db) $this->_db = DialectORM::DBHandler();
        return $this->_db;
    }

    public function sql()
    {
        if (!$this->_sql) $this->_sql = DialectORM::SQLBuilder();
        return $this->_sql;
    }

    public function get_($field, $default = null)
    {
        if (is_array($field))
        {
            $self = $this;
            return array_map(function($i) use ($self, $field, $default) {
                return $self->get_($field[$i], is_array($default) ? $default[$i] : $default);
            }, array_keys($field));
        }

        $field = (string)$field;

        if (!is_array($this->data) || !array_key_exists($field, $this->data))
        {
            if (in_array($field, static::$fields)) return $default;
            throw new DialectORMException('Undefined Field: "'.$field.'" in ' . get_class($this) . ' via get()', 1);
        }

        return $this->data[$field];
    }

    public function get($field, $default = null, $options = array())
    {
        if (is_array($field))
        {
            $self = $this;
            return array_map(function($i) use ($self, $field, $default, $options) {
                return $self->get($field[$i], is_array($default) ? $default[$i] : $default, $options);
            }, array_keys($field));
        }

        $field = (string)$field;

        if (isset(static::$relationships[$field]))
        {
            return $this->_getRelated($field, $default, $options);
        }
        if (!is_array($this->data) || !array_key_exists($field, $this->data))
        {
            if (in_array($field, static::$fields)) return $default;
            if ($this->eav) return $this->eav->get($field, $default);
            throw new DialectORMException('Undefined Field: "'.$field.'" in ' . get_class($this) . ' via get()', 1);
        }

        return $this->data[$field];
    }

    private function _getRelated($field, $default = null, $options = array())
    {
        $rel = null;
        if ($field instanceof DialectORMRelation)
        {
            $rel = $field;
            $field = $rel->field;
        }
        elseif (isset($this->relations[$field]))
        {
            $rel = $this->relations[$field];
        }
        elseif (isset(static::$relationships[$field]))
        {
            $type = static::$relationships[$field][0];
            $a = get_class($this);
            $b = static::$relationships[$field][1];
            $kb = static::$relationships[$field][2];
            $ka = isset(static::$relationships[$field][3]) ? static::$relationships[$field][3] : null;
            $ab = isset(static::$relationships[$field][4]) ? static::$relationships[$field][4] : null;
            $rel = new DialectORMRelation($type, $a, $b, $kb, $ka, $ab);
            $rel->field = $field;
            $this->relations[$field] = $rel;
        }
        if ($rel)
        {
            $options = array_merge(array(
                'conditions' => array(),
                'order' => array(),
                'limit' => null,
            ), (array)$options);

            if (in_array($rel->type, array('hasmany','belongstomany')) && empty($default))
                $default = array();

            if (false === $rel->data)
            {
                switch ($rel->type)
                {
                    case 'hasone':
                    case 'hasmany':
                        $class = $rel->b;
                        $fk = $rel->keyb;
                        $rel->data = 'hasone' === $rel->type ? $class::fetchAll(array(
                            'conditions' => DialectORM::key($fk, $this->primaryKey(), array()),
                            'single' => true
                        )) : $class::fetchAll(array(
                            'conditions' => array_merge($options['conditions'], DialectORM::key($fk, $this->primaryKey(), array())),
                            'order' => $options['order'],
                            'limit' => $options['limit'],
                        ));
                        if (!empty($rel->data) && ($mirrorRel = $this->_getMirrorRel($rel)))
                        {
                            if (is_array($rel->data))
                            {
                                foreach ($rel->data as $entity)
                                {
                                    //$entity->set($rel->keyb, $this->primaryKey());
                                    $entity->set($mirrorRel->field, $this, array('recurse'=>false));
                                }
                            }
                            else
                            {
                                $entity = $rel->data;
                                //$entity->set($rel->keyb, $this->primaryKey());
                                $entity->set($mirrorRel->field, $this, array('recurse'=>false));
                            }
                        }
                        break;
                    case 'belongsto':
                        $class = $rel->b;
                        $rel->data = $class::fetchByPk($this->get_($rel->keyb), null);
                        if (!empty($rel->data) && ($mirrorRel = $this->_getMirrorRel($rel)))
                        {
                            $entity = $rel->data;
                            $entity->set($mirrorRel->field, 'hasone' === $mirrorRel->type ? $this : array($this), array('recurse'=>false,'merge'=>true));
                        }
                        break;
                    case 'belongstomany':
                        $class = $rel->b;
                        $tbl = $class::tbl($class::$table);
                        $jtbl = $class::tbl($rel->ab);
                        $jon = array();
                        $pk = (array)$class::$pk;
                        $fk = (array)$rel->keyb;
                        foreach (array_keys($pk) as $i) $jon[$tbl . '.' . $pk[$i]] = $jtbl . '.' . $fk[$i];
                        $fields = $class::$fields;
                        foreach ($fields as $i => $field) $fields[$i] = $tbl . '.' . $field . ' AS ' . $field;
                        $this->sql()->clear()
                            ->Select($fields)
                            ->From($tbl)
                            ->Join($jtbl, $jon, 'inner')
                            ->Where(array_merge($options['conditions'], DialectORM::key($rel->keya, $this->primaryKey(), array(), $jtbl . '.')))
                        ;
                        if (!empty($options['order']))
                        {
                            foreach ($options['order'] as $field => $dir)
                                $this->sql()->Order($field, $dir);
                        }
                        if (!empty($options['limit']))
                        {
                            if (is_array($options['limit']))
                                $this->sql()->Limit($options['limit'][0], isset($options['limit'][1])?$options['limit'][1]:0);
                            else
                                $this->sql()->Limit($options['limit'], 0);
                        }
                        $rel->data = array_map(function($data) use ($class) {
                            return new $class($data);
                        }, $this->db()->get((string)$this->sql()));
                        break;
                }
            }
            return empty($rel->data) ? $default : $rel->data;
        }
        return $default;
    }

    public function set($field, $val = null, $options = array())
    {
        if (is_array($field))
        {
            foreach($field as $i => $f)
                $this->set($f, is_array($val) ? $val[$i] : $val, $options);
            return $this;
        }

        $field = (string)$field;

        $options = array_merge(array(
            'raw' => false,
            'recurse' => true,
            'merge' => false,
        ), (array)$options);

        if (isset(static::$relationships[$field]))
        {
            return $this->_setRelated($field, $val, $options);
        }

        if (!in_array($field, static::$fields))
        {
            if ($this->eav)
            {
                $tval = $val;
                if (!$options['raw'])
                {
                    $fieldProp = DialectORM::camelCase($field, true);
                    $typecast = 'type' . $fieldProp;
                    if (method_exists($this, $typecast))
                    {
                        $tval = $this->{$typecast}($val);
                    }
                    $validate = 'validate' . $fieldProp;
                    if (method_exists($this, $validate))
                    {
                        $valid = $this->{$validate}($tval);
                        if (!$valid) throw new DialectORMException('Value: "'.$val.'" is not valid for Field: "'.$field.'" in '.get_class($this), 1);
                    }
                }
                $this->eav->set($field, $tval);
                return $this;
            }
            else
            {
                throw new DialectORMException('Undefined Field: "'.$field.'" in ' . get_class($this) . ' via set()', 1);
            }
        }

        $tval = $val;
        if (!$options['raw'])
        {
            $fieldProp = DialectORM::camelCase($field, true);
            $typecast = 'type' . $fieldProp;
            if (method_exists($this, $typecast))
            {
                $tval = $this->{$typecast}($val);
            }
            $validate = 'validate' . $fieldProp;
            if (method_exists($this, $validate))
            {
                $valid = $this->{$validate}($tval);
                if (!$valid) throw new DialectORMException('Value: "'.$val.'" is not valid for Field: "'.$field.'" in '.get_class($this), 1);
            }
        }
        if (!is_array($this->data))
        {
            $this->data = array();
            $this->isDirty = array();
        }
        if (!array_key_exists($field, $this->data) || ($this->data[$field] !== $tval))
        {
            $this->isDirty[$field] = true;
            $this->data[$field] = $tval;
        }
        return $this;
    }

    private function _setRelated($field, $data, $options = array())
    {
        $rel = null;
        if ($field instanceof DialectORMRelation)
        {
            $rel = $field;
            $field = $rel->field;
        }
        elseif (isset($this->relations[$field]))
        {
            $rel = $this->relations[$field];
        }
        elseif (isset(static::$relationships[$field]))
        {
            $type = static::$relationships[$field][0];
            $a = get_class($this);
            $b = static::$relationships[$field][1];
            $kb = static::$relationships[$field][2];
            $ka = isset(static::$relationships[$field][3]) ? static::$relationships[$field][3] : null;
            $ab = isset(static::$relationships[$field][4]) ? static::$relationships[$field][4] : null;
            $rel = new DialectORMRelation($type, $a, $b, $kb, $ka, $ab);
            $rel->field = $field;
            $this->relations[$field] = $rel;
        }
        if ($rel)
        {
            if ($options['merge'] && is_array($data) && is_array($rel->data))
            {
                $pks = array_map(function($k) {return DialectORM::strkey($k);}, static::pluck($rel->data));
                foreach ($data as $d)
                {
                    $dpk = $d->primaryKey();
                    // add entities that do not exist already
                    $sk = DialectORM::strkey($dpk);
                    if (DialectORM::emptykey($dpk) || !in_array($sk, $pks))
                    {
                        $rel->data[] = $d;
                        if (!DialectORM::emptykey($dpk)) $pks[] = $sk;
                    }
                }
            }
            else
            {
                $rel->data = $data;
            }
            if ($options['recurse'] && !empty($rel->data) && ($mirrorRel = $this->_getMirrorRel($rel)))
            {
                switch ($mirrorRel->type)
                {
                    case 'belongsto':
                        $pk = $this->primaryKey();
                        if (is_array($rel->data))
                        {
                            foreach ($rel->data as $entity)
                            {
                                $entity->set($rel->keyb, $pk);
                                $entity->set($mirrorRel->field, $this, array('recurse'=>false));
                            }
                        }
                        else
                        {
                            $entity = $rel->data;
                            $entity->set($rel->keyb, $pk);
                            $entity->set($mirrorRel->field, $this, array('recurse'=>false));
                        }
                        break;
                    case 'hasone':
                        $entity = $rel->data;
                        $entity->set($mirrorRel->field, $this, array('recurse'=>false));
                        break;
                    case 'hasmany':
                        $entity = $rel->data;
                        $entity->set($mirrorRel->field, array($this), array('recurse'=>false,'merge'=>true));
                        break;
                }
            }
        }
        return $this;
    }

    private function _getMirrorRel($rel)
    {
        switch ($rel->type)
        {
            case 'hasone':
            case 'hasmany':
                $thisclass = get_class($this);
                $class = $rel->b;
                foreach ($class::$relationships as $f => $r)
                {
                    if ('belongsto' === strtolower($r[0]) && $thisclass === $r[1] && DialectORM::eq($rel->keyb, $r[2]))
                    {
                        return (object)array('type'=>'belongsto', 'field'=>$f);
                    }
                }
                break;
            case 'belongsto':
                $thisclass = get_class($this);
                $class = $rel->b;
                foreach ($class::$relationships as $f => $r)
                {
                    if (('hasone' === strtolower($r[0]) || 'hasmany' === strtolower($r[0])) && $thisclass === $r[1] && DialectORM::eq($rel->keyb, $r[2]))
                    {
                        return (object)array('type'=>strtolower($r[0]), 'field'=>$f);
                    }
                }
                break;
        }
        return null;
    }

    public function has($field)
    {
        return !isset(static::$relationships[$field]) && ((is_array($this->data) && array_key_exists($field, $this->data)) || ($this->eav && array_key_exists($field, $this->eav->data)));
    }

    public function assoc($field, $entity)
    {
        if (!isset(static::$relationships[$field]))
        {
            throw new DialectORMException('Undefined Field: "'.$field.'" in ' . get_class($this) . ' via assoc()', 1);
        }
        if (!DialectORM::emptykey($id = $this->primaryKey()))
        {
            $rel = static::$relationships[$field];
            $type = strtolower($rel[0]); $class = $rel[1];
            switch ($type)
            {
                case 'belongstomany':
                    $jtbl = DialectORM::tbl($rel[4]);
                    $eids = array();
                    foreach ($entity as $ent)
                    {
                        if (!($ent instanceof $class)) continue;
                        $eid = $ent->primaryKey();
                        if (DialectORM::emptykey($eid)) continue;
                        $eids[] = $eid;
                    }

                    $conditions = DialectORM::key($rel[3], $id, array());
                    if (is_array($rel[2]))
                    {
                        $conditions[DialectORM::strkey($rel[2])] = array('or'=>array_map(function($id) use ($rel) {
                            return DialectORM::key($rel[2], $id, array());
                        }, $eids));
                    }
                    else
                    {
                        $conditions[$rel[2]] = array('in'=>$eids);
                    }
                    $exists = array_map(function($v) use($rel) {return DialectORM::strkey(array_map(function($k) use ($v) {return $v[$k];}, (array)$rel[2]));}, empty($eids) ? array() : $this->db()->get(
                        $this->sql()->clear()
                            ->Select($rel[2])
                            ->From($jtbl)
                            ->Where($conditions)
                            ->sql()
                    ));

                    $values = array();
                    foreach ($entity as $ent)
                    {
                        if (!($ent instanceof $class)) continue;
                        $eid = $ent->primaryKey();
                        if (DialectORM::emptykey($eid)) continue;
                        if (!in_array($sk = DialectORM::strkey($eid), $exists))
                        {
                            $exists[] = $sk;
                            $values[] = array_merge((array)$eid, (array)$id);
                        }
                    }

                    if (!empty($values))
                    {
                        $this->db()->query(
                            $this->sql()->clear()
                                ->Insert($jtbl, array_merge((array)$rel[2], (array)$rel[3]))
                                ->Values($values)
                                ->sql()
                        );
                    }
                    $this->sql()->clear();
                    break;
                case 'belongsto':
                    if (($entity instanceof $class) && !DialectORM::emptykey($entity->primaryKey()))
                        $this->set($rel[2], $entity->primaryKey())->save();
                    break;
                case 'hasone':
                    if ($entity instanceof $class)
                        $entity->set($rel[2], $id)->save();
                    break;
                case 'hasmany':
                    foreach ($entity as $ent)
                    {
                        if (!($ent instanceof $class)) continue;
                        $ent->set($rel[2], $id)->save();
                    }
                    break;
            }
        }
        return $this;
    }

    public function dissoc($field, $entity)
    {
        if (!isset(static::$relationships[$field]))
        {
            throw new DialectORMException('Undefined Field: "'.$field.'" in ' . get_class($this) . ' via dissoc()', 1);
        }
        if (!DialectORM::emptykey($id = $this->primaryKey()))
        {
            $rel = static::$relationships[$field];
            $type = strtolower($rel[0]); $class = $rel[1];
            switch ($type)
            {
                case 'belongstomany':
                    $jtbl = DialectORM::tbl($rel[4]);
                    $values = array();
                    foreach ($entity as $ent)
                    {
                        if (!($ent instanceof $class)) continue;
                        $eid = $ent->primaryKey();
                        if (DialectORM::emptykey($eid)) continue;
                        $values[] = $eid;
                    }
                    if (!empty($values))
                    {
                        $conditions = DialectORM::key($rel[3], $id, array());
                        if (is_array($rel[2]))
                        {
                            $conditions[DialectORM::strkey($rel[2])] = array('or'=>array_map(function($id) use ($rel) {
                                return DialectORM::key($rel[2], $id, array());
                            }, $values));
                        }
                        else
                        {
                            $conditions[$rel[2]] = array('in'=>$values);
                        }
                        $this->db()->query(
                            $this->sql()->clear()
                                ->Delete()
                                ->From($jtbl)
                                ->Where($conditions)
                                ->sql()
                        );
                        $this->sql()->clear();
                    }
                    break;
                case 'belongsto':
                case 'hasone':
                case 'hasmany':
                    break;
            }
        }
        return $this;
    }

    public function clear()
    {
        $this->data = null;
        $this->isDirty = null;
        foreach ($this->relations as $rel) $rel->data = null;
        if ($this->eav) $this->eav->clear();
        return $this;
    }

    public function __call($method, $args = array())
    {
        $prefix = substr($method, 0, 3);
        if ('get' === $prefix)
        {
            return !empty($args) ? $this->get(DialectORM::snake_case(substr($method, 3)), $args[0], isset($args[1]) ? $args[1] : array()) : $this->get(DialectORM::snake_case(substr($method, 3)));
        }
        elseif ('set' === $prefix)
        {
            return $this->set(DialectORM::snake_case(substr($method, 3)), empty($args) ? null : $args[0], isset($args[1]) ? $args[1] : array());
        }
        elseif ('has' === $prefix)
        {
            return $this->has(DialectORM::snake_case(substr($method, 3)));
        }
        elseif ('assoc' === substr($method, 0, 5))
        {
            return $this->assoc(DialectORM::snake_case(substr($method, 5)), $args[0]);
        }
        elseif ('dissoc' === substr($method, 0, 6))
        {
            return $this->dissoc(DialectORM::snake_case(substr($method, 6)), $args[0]);
        }
        else
        {
            throw new BadMethodCallException('Undefined method call "'.$method.'" in ' . get_class($this), 1);
        }
    }

    private function _populate($data)
    {
        if (empty($data)) return $this;

        if (is_array(static::$pk))
        {
            $hydrateFromDB = true;
            foreach (static::$pk as $k)
                $hydrateFromDB = $hydrateFromDB && !empty($data[$k]);
        }
        else
        {
            $hydrateFromDB = !empty($data[static::$pk]);
        }
        foreach (static::$fields as $field)
        {
            if (array_key_exists($field, $data))
            {
                $this->set($field, $data[$field]);
            }
            else
            {
                $hydrateFromDB = false;
                if (!$this->data || !array_key_exists($field, $this->data))
                    $this->set($field, null);
            }
        }
        // populated from DB hydration, clear dirty flags
        if ($hydrateFromDB) $this->isDirty = array();
        return $this;
    }

    public function toArray($deep = false, $diff = false, $stack = array())
    {
        $class = get_class($this);
        if (in_array($class, $stack)) return null;
        $a = array();
        foreach (static::$fields as $field)
        {
            if ($diff && !isset($this->isDirty[$field])) continue;
            $a[$field] = $this->get_($field);
        }
        if ($deep && !$diff)
        {
            if ($this->eav)
            {
                $val_key = static::$extra_fields[4];
                foreach ($this->eav->data as $field => $entry)
                {
                    //if ($diff && !isset($this->eav->isDirty[$field])) continue;
                    $a[$field] = $entry[$val_key];
                }
            }
            array_push($stack, $class);
            foreach (array_keys(static::$relationships) as $field)
            {
                if (!isset($this->relations[$field]) || empty($this->relations[$field]->data)) continue;

                $entity = $this->relations[$field]->data;
                $data = null;

                if (is_array($entity))
                {
                    $data = array();
                    foreach ($entity as $e)
                    {
                        $d = $e->toArray(true, false, $stack);
                        if (!empty($d)) $data[] = $d;
                    }
                }
                else
                {
                    $data = $entity->toArray(true, false, $stack);
                }

                if (!empty($data)) $a[$field] = $data;
            }
            array_pop($stack);
        }
        return $a;
    }

    public function save($options = array())
    {
        $options = array_merge(array(
            'force' => false,
            'withRelated' => false,
        ), (array)$options);

        $res = 0;

        if (true === $options['withRelated']) $withRelated = array_keys(static::$relationships);
        elseif (false === $options['withRelated']) $withRelated = array();
        else $withRelated = (array)$options['withRelated'];

        foreach ($withRelated as $field)
        {
            if (!isset($this->relations[$field])) continue;
            $rel = $this->relations[$field]; $entity = $rel->data; $class = $rel->b;
            if (in_array($rel->type, array('belongsto')) && ($entity instanceof $class))
            {
                $entity->save();//{'withRelated' : [f for f in cls.relationships if cls.relationships[f][1] != klass]}
                $this->set($rel->keyb, $entity->primaryKey());
            }
        }

        $pk = static::$pk;
        if (!empty($this->isDirty))
        {
            $this->beforeSave();

            $id = $this->primaryKey();
            if (!DialectORM::emptykey($id) && !$options['force'])
            {
                // update
                $this->sql()->clear()
                ->Update(DialectORM::tbl(static::$table))
                ->Set($this->toArray(false, true))
                ->Where(DialectORM::key($pk, $id, array()))
                ;
            }
            else
            {
                // insert
                $data = $this->data;
                $this->sql()->clear()
                ->Insert(DialectORM::tbl(static::$table), static::$fields)
                ->Values(array_map(function($f) use ($data) {return array_key_exists($f, $data) ? $data[$f] : null;}, static::$fields))
                ;
            }


            $res = $this->db()->query((string)$this->sql());
            if (DialectORM::emptykey($id)) $this->set($pk, is_array($pk) ? array($res['insertId']) : $res['insertId']);
            $res = $res['affectedRows'];
            $this->isDirty = array();

            $this->afterSave($res);
        }

        $id = $this->primaryKey();
        if (!DialectORM::emptykey($id))
        {
            foreach ($withRelated as $field)
            {
                if (!isset($this->relations[$field]) || in_array($this->relations[$field]->type, array('belongsto'))) continue;
                $rel = $this->relations[$field]; $class = $rel->b;
                if (!empty($rel->data))
                {
                    if (is_array($rel->data))
                    {
                        if ('hasmany' === $rel->type)
                        {
                            foreach ($rel->data as $entity)
                            {
                                if ($entity instanceof $class)
                                    $entity->set($rel->keyb, $id);
                            }
                        }
                        foreach ($rel->data as $entity)
                        {
                            if ($entity instanceof $class)
                                $entity->save();
                        }
                    }
                    else
                    {
                        $entity = $rel->data;
                        if ('hasone' === $rel->type)
                        {
                            if ($entity instanceof $class)
                                $entity->set($rel->keyb, $id);
                        }
                        if ($entity instanceof $class)
                            $entity->save();
                    }
                    if ('belongstomany' === $rel->type)
                    {
                        $jtbl = DialectORM::tbl($rel->ab);
                        $entities = (array)$rel->data;
                        $eids = array();
                        foreach ($entities as $entity)
                        {
                            if (!($entity instanceof $class)) continue;
                            $eid = $entity->primaryKey();
                            if (DialectORM::emptykey($eid)) continue;
                            $eids[] = $eid;
                        }

                        // the most cross-platform way seems to do an extra select to check if relation already exists
                        // https://stackoverflow.com/questions/13041023/insert-on-duplicate-key-update-nothing-using-mysql/13041065
                        $conditions = DialectORM::key($rel->keya, $id, array());
                        if (is_array($rel->keyb))
                        {
                            $conditions[DialectORM::strkey($rel->keyb)] = array('or'=>array_map(function($id) use ($rel) {
                                return DialectORM::key($rel->keyb, $id, array());
                            }, $eids));
                        }
                        else
                        {
                            $conditions[$rel->keyb] = array('in'=>$eids);
                        }
                        $exists = array_map(function($v) use ($rel) {return DialectORM::strkey(array_map(function($k) use ($v) {return $v[$k];},(array)$rel->keyb));}, empty($eids) ? array() : $this->db()->get(
                            $this->sql()->clear()
                                ->Select($rel->keyb)
                                ->From($jtbl)
                                ->Where($conditions)
                                ->sql()
                        ));

                        $values = array();
                        foreach ($entities as $entity)
                        {
                            if (!($entity instanceof $class)) continue;
                            $eid = $entity->primaryKey();
                            if (DialectORM::emptykey($eid)) continue;
                            if (!in_array($sk = DialectORM::strkey($eid), $exists))
                            {
                                $exists[] = $sk;
                                $values[] = array_merge((array)$eid, (array)$id);
                            }
                        }

                        if (!empty($values))
                        {
                            $this->db()->query(
                                $this->sql()->clear()
                                    ->Insert($jtbl, array_merge((array)$rel->keyb, (array)$rel->keya))
                                    ->Values($values)
                                    ->sql()
                            );
                        }
                    }
                }
            }
        }

        $this->sql()->clear();
        if ($this->eav) $this->eav->entity($this)->save();
        return $res;
    }

    public function delete($options = array())
    {
        $options = array_merge(array(
            'withRelated' => false,
        ), (array)$options);

        $res = 0;

        if (is_array($this->data))
        {
            $pk = static::$pk;
            $id = $this->primaryKey();
            if (!DialectORM::emptykey($id))
            {
                // delete
                /*if ($this->eav)
                {
                    $this->eav->entity($this)->delete();
                }*/
                $res = static::deleteAll(array(
                    'conditions' => DialectORM::key($pk, $id, array()),
                    'withRelated' => $options['withRelated']
                ));
            }
            $this->clear();
        }

        return $res;
    }
}

interface IDialectORMNoSql
{
    public function vendor();
    public function supportsPartialUpdates();
    public function supportsConditionalQueries();
    public function insert($collection, $key, $data);
    public function update($collection, $key, $data);
    public function delete($collection, $key);
    public function find($collection, $key);
    public function findAll($collection, $conditions);
}

class DialectNoSqlException extends Exception
{
}

class DialectNoSql extends DialectORMEntity
{
    const VERSION = '2.1.0';

    protected static $strh = null;

    public static $collection = null;

    private $_str = null;

    private $data = null;
    private $isDirty = null;

    public static function NoSqlHandler($store = null)
    {
        if (func_num_args())
        {
            if (!($store instanceof IDialectORMNoSql))
                throw new DialectNoSqlException('DialectNoSql Store must implement IDialectORMNoSql', 1);
            DialectNoSql::$strh = $store;
        }
        return DialectNoSql::$strh;
    }

    public static function fetchByPk($id, $default = null)
    {
        $entity = DialectNoSql::NoSqlHandler()->find(static::$collection, is_array(static::$pk) ? DialectNoSql::key(static::$pk, $id) : $id);
        return !empty($entity) ? new static(isset($entity[0])&&is_array($entity[0]) ? (array)$entity[0] : (array)$entity) : $default;
    }

    public static function fetchAll($options = array(), $default = array())
    {
        if (DialectNoSql::NoSqlHandler()->supportsConditionalQueries())
        {
            $entities = DialectNoSql::NoSqlHandler()->findAll(static::$collection, (array)$options);
            if (empty($entities)) return $default;
            foreach($entities as $i => $entity)
            {
                $entities[$i] = new static((array)$entity);
            }
            return $entities;
        }
        return $default;
    }

    public function __construct($data = array())
    {
        if (is_array($data) && !empty($data))
            $this->_populate($data);
    }

    public function storage()
    {
        if (!$this->_str) $this->_str = DialectNoSql::NoSqlHandler();
        return $this->_str;
    }

    public function get($field, $default = null, $options = array())
    {
        if (is_array($field))
        {
            $self = $this;
            return array_map(function($i) use ($self, $field, $default, $options) {
                return $self->get($field[$i], is_array($default) ? $default[$i] : $default, $options);
            }, array_keys($field));
        }

        $field = (string)$field;

        if (!is_array($this->data) || !array_key_exists($field, $this->data))
        {
            throw new DialectNoSqlException('Undefined Field: "'.$field.'" in ' . get_class($this) . ' via get()', 1);
        }

        return $this->data[$field];
    }

    public function set($field, $val = null, $options = array())
    {
        if (is_array($field))
        {
            foreach($field as $i => $f)
                $this->set($f, is_array($val) ? $val[$i] : $val, $options);
            return $this;
        }

        $field = (string)$field;

        $options = array_merge(array(
            'raw' => false,
        ), (array)$options);


        $tval = $val;
        if (!$options['raw'])
        {
            $fieldProp = DialectNoSql::camelCase($field, true);
            $typecast = 'type' . $fieldProp;
            if (method_exists($this, $typecast))
            {
                $tval = $this->{$typecast}($val);
            }
            $validate = 'validate' . $fieldProp;
            if (method_exists($this, $validate))
            {
                $valid = $this->{$validate}($tval);
                if (!$valid) throw new DialectNoSqlException('Value: "'.$val.'" is not valid for Field: "'.$field.'" in '.get_class($this), 1);
            }
        }
        if (!is_array($this->data))
        {
            $this->data = array();
            $this->isDirty = array();
        }
        if (!array_key_exists($field, $this->data) || ($this->data[$field] !== $tval))
        {
            $this->isDirty[$field] = true;
            $this->data[$field] = $tval;
        }
        return $this;
    }

    public function has($field)
    {
        return is_array($this->data) && array_key_exists($field, $this->data);
    }

    public function clear()
    {
        $this->data = null;
        $this->isDirty = null;
        return $this;
    }

    public function __call($method, $args = array())
    {
        $prefix = substr($method, 0, 3);
        if ('get' === $prefix)
        {
            return !empty($args) ? $this->get(DialectNoSql::snake_case(substr($method, 3)), $args[0], isset($args[1]) ? $args[1] : array()) : $this->get(DialectNoSql::snake_case(substr($method, 3)));
        }
        elseif ('set' === $prefix)
        {
            return $this->set(DialectNoSql::snake_case(substr($method, 3)), empty($args) ? null : $args[0], isset($args[1]) ? $args[1] : array());
        }
        elseif ('has' === $prefix)
        {
            return $this->has(DialectNoSql::snake_case(substr($method, 3)));
        }
        else
        {
            throw new BadMethodCallException('Undefined method call "'.$method.'" in ' . get_class($this), 1);
        }
    }

    private function _populate($data)
    {
        if (empty($data)) return $this;

        if (is_array(static::$pk))
        {
            $hydrateFromDB = true;
            foreach (static::$pk as $k)
                $hydrateFromDB = $hydrateFromDB && !empty($data[$k]);
        }
        else
        {
            $hydrateFromDB = !empty($data[static::$pk]);
        }
        foreach ($data as $field => $val)
        {
            $this->set($field, $val);
        }
        // populated from Store hydration, clear dirty flags
        if ($hydrateFromDB) $this->isDirty = array();
        return $this;
    }

    public function toArray($diff = false)
    {
        $a = array();
        $fields = array_keys($this->data);
        sort($fields, SORT_STRING);
        foreach ($fields as $field)
        {
            if ($diff && !isset($this->isDirty[$field])) continue;
            $a[$field] = $this->data[$field];
        }
        return $a;
    }

    public function save($options = array())
    {
        $options = array_merge(array(
            'update' => false,
        ), (array)$options);

        $res = 0;

        if (!empty($this->isDirty))
        {
            $pk = static::$pk;
            $id = $this->primaryKey();
            if (DialectNoSql::emptykey($id))
            {
                throw new DialectNoSqlException('Empty key in ' . get_class($this) . '::save()', 1);
            }

            $this->beforeSave();

            if ($options['update'])
            {
                // update
                $res = $this->storage()->update(static::$collection, is_array($pk) ? DialectNoSql::key($pk, $id) : $id, $this->toArray($this->storage()->supportsPartialUpdates()));
            }
            else
            {
                // insert
                $res = $this->storage()->insert(static::$collection, is_array($pk) ? DialectNoSql::key($pk, $id) : $id, $this->toArray(false));
            }


            $this->isDirty = array();

            $this->afterSave($res);
        }

        return $res;
    }

    public function delete($options = array())
    {
        $options = array_merge(array(
        ), (array)$options);

        $res = 0;

        if (is_array($this->data))
        {
            $pk = static::$pk;
            $id = $this->primaryKey();
            if (!DialectNoSql::emptykey($id))
            {
                // delete
                $res = $this->storage()->delete(static::$collection, is_array($pk) ? DialectNoSql::key($pk, $id) : $id);
            }
            $this->clear();
        }

        return $res;
    }
}
}