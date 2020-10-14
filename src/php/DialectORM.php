<?php
/**
*   DialectORM,
*   a tiny, fast, super-simple but versatile Object-Relational-Mapper w/ Relationships for PHP, JavaScript, Python
*
*   @version: 1.0.0
*   https://github.com/foo123/DialectORM
**/

if ( !class_exists('DialectORM', false) )
{
interface IDialectORMDb
{
    public function vendor();
    public function escape($str);
    public function escapeWillQuote();
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

    public function __construct($type, $a, $b, $kb, $ka=null, $ab=null)
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

class DialectORM
{
    const VERSION = '1.0.0';

    public static $table = null;
    public static $pk = null;
    public static $fields = array();
    public static $relationships = array();

    protected static $dependencies = array();
    protected static $DB = null;
    protected static $prefix = '';

    private $_sql = null;

    private $relations = array();
    private $data = null;
    private $isDirty = null;

    public static function setDependencies($deps)
    {
        DialectORM::$dependencies = array_merge(DialectORM::$dependencies, (array)$deps);
    }

    public static function getDependency($dep, $default=null)
    {
        return isset(DialectORM::$dependencies[$dep]) ? DialectORM::$dependencies[$dep] : $default;
    }

    public static function setDB($db)
    {
        if ( !($db instanceof IDialectORMDb) )
            throw new DialectORMException('DialectORM DB must implement IDialectORMDb', 1);
        DialectORM::$DB = $db;
    }

    public static function getDB()
    {
        return DialectORM::$DB;
    }

    public static function getSQL()
    {
        if ( !class_exists('Dialect', false) )
        {
            $entry = DialectORM::getDependency('Dialect');
            if ( !empty($entry) ) include($entry);
        }
        $db = DialectORM::getDB();
        $sql = new Dialect($db->vendor());
        $sql->escape(array($db, 'escape'), $db->escapeWillQuote());
        if (method_exists($db, 'escapeId'))
        {
            $sql->escapeId(array($db, 'escapeId'), method_exists($db, 'escapeIdWillQuote') ? $db->escapeIdWillQuote() : false);
        }
        return $sql;
    }

    public static function setPrefix($prefix)
    {
        DialectORM::$prefix = (string)$prefix;
    }

    public static function getPrefix()
    {
        return DialectORM::$prefix;
    }


    public static function tbl($table)
    {
        return DialectORM::getPrefix().$table;
    }

    public static function pluck($entities, $field='')
    {
        if ( ''===$field )
        {
            return array_map(function($entity) {
                return $entity->primaryKey();
            }, $entities);
        }
        else
        {
            return array_map(function($entity) use ($field) {
                return $entity->get($field);
            }, $entities);
        }
    }

    public static function snake_case( $s, $sep='_' )
    {
        $s = preg_replace_callback('#[A-Z]#', function($m)use($sep){return $sep.strtolower($m[0]);}, lcfirst($s));
        return $sep===substr($s, 0, 1) ? substr($s, 1) : $s;
    }

    public static function camelCase( $s, $PascalCase=false, $sep='_' )
    {
        $s = preg_replace_callback('#'.preg_quote($sep, '#').'([a-z])#', function($m){return strtoupper($m[1]);}, $s);
        return $PascalCase ? ucfirst($s) : $s;
    }

    public static function getByPk($id, $default=null)
    {
        $pk = static::$pk;
        $entity = DialectORM::getDB()->get(
            DialectORM::getSQL()
                ->Select(static::$fields)
                ->From(DialectORM::tbl(static::$table))
                ->Where(array("$pk"=>$id))
                ->sql()
        );
        return !empty($entity) ? new static(isset($entity[0])&&is_array($entity[0]) ? (array)$entity[0] : (array)$entity) : $default;
    }

    public static function sorter($args=array())
    {
        // Array multi - sorter utility
        // returns a sorter that can (sub-)sort by multiple (nested) fields
        // each ascending or descending independantly

        /*$args = func_get_args( );*/
        // + before a (nested) field indicates ascending sorting (default),
        // example "+a.b.c"
        // - before a (nested) field indicates descending sorting,
        // example "-b.c.d"
        $l = count($args);
        if ( $l )
        {
            $step = 1;
            $sorter = array();
            $variables = array();
            $sorter_args = array();
            $filter_args = array();
            for ($i=$l-1; $i>=0; $i--)
            {
                $field = $args[$i];
                // if is array, it contains a filter function as well
                array_unshift($filter_args, '$f'.$i);
                if ( is_array($field) )
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
                if ( '-' === $dir )
                {
                    $desc = true;
                    $field = substr($field, 1);
                }
                elseif ( '+' === $dir )
                {
                    $desc = false;
                    $field = substr($field, 1);
                }
                else
                {
                    // default ASC
                    $desc = false;
                }
                $field = strlen($field) ? implode('', array_map(function($f){return !strlen($f) ? '' : (preg_match('#^\\d+$#', $f) ? ('['.$f.']') : ('->get'.DialectORM::camelCase($f, true).'()'));}, explode('.', $field)))/*'["' . implode('"]["', explode('.', $field)) . '"]'*/ : '';
                $a = '$a'.$field; $b = '$b'.$field;
                if ( $sorter_args[0] )
                {
                    $a = 'call_user_func(' . $filter_args[0] . ',' . $a . ')';
                    $b = 'call_user_func(' . $filter_args[0] . ',' . $b . ')';
                }
                $avar = '$a_'.$i; $bvar = '$b_'.$i;
                array_unshift($variables, ''.$avar.'='.$a.';'.$bvar.'='.$b.';');
                $lt = $desc ?(''.$step):('-'.$step); $gt = $desc ?('-'.$step):(''.$step);
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

    public static function count($options=array())
    {
        $options = array_merge(array(
            'conditions' => array(),
        ), (array)$options);

        $sql = DialectORM::getSQL()
            ->Select('COUNT(*) AS cnt')
            ->From(DialectORM::tbl(static::$table))
            ->Where($options['conditions'])
        ;

        $res = DialectORM::getDB()->get($sql->sql());
        return $res[0]['cnt'];
    }

    public static function getAll($options=array(), $default=array())
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
        if ( $retSingle && empty($default) )
            $default = null;

        $pk = static::$pk;
        $sql = DialectORM::getSQL()
            ->Select(static::$fields)
            ->From(DialectORM::tbl(static::$table))
            ->Where($options['conditions'])
        ;
        if ( !empty($options['order']) )
        {
            foreach($options['order'] as $field=>$dir)
                $sql->Order($field, $dir);
        }
        if ( !empty($options['limit']) )
        {
            if ( is_array($options['limit']) )
                $sql->Limit($options['limit'][0], isset($options['limit'][1])?$options['limit'][1]:0);
            else
                $sql->Limit($options['limit'], 0);
        }
        elseif ( $retSingle )
        {
            $sql->Limit(1, 0);
        }

        $entities = DialectORM::getDB()->get($sql->sql());

        if ( empty($entities) ) return $default;

        foreach($entities as $i=>$e) $entities[$i] = new static($e);

        if ( !empty($options['withRelated']) )
        {
            // eager optimised (no N+1 issue) loading of selected relations
            $ids = static::pluck($entities);
            foreach($options['withRelated'] as $field)
            {
                if ( !isset(static::$relationships[$field]) ) continue;
                $rel = static::$relationships[$field];
                $type = strtolower($rel[0]); $class = $rel[1];
                switch($type)
                {
                    case 'hasone':
                        $fk = $rel[2];
                        $conditions = array("$fk"=>array('in'=>$ids));
                        if ( isset($options['related'][$field]['conditions']) )
                            $conditions = array_merge($options['related'][$field]['conditions'], $conditions);
                        $rentities = $class::getAll(array(
                            'conditions' => $conditions
                        ));
                        $map = array();
                        foreach($rentities as $re)
                        {
                            $map[(string)$re->get($fk)] = $re;
                        }
                        foreach($entities as $e)
                        {
                            $kv = (string)$e->primaryKey();
                            $e->set($field, isset($map[$kv]) ? $map[$kv] : null);
                        }
                        break;
                    case 'hasmany':
                        $fk = $rel[2];
                        if (isset($options['related'][$field]['limit']))
                        {
                            $sql = DialectORM::getSQL();
                            $selects = array();
                            foreach($ids as $id)
                            {
                                $conditions = array("$fk"=>$id);
                                if ( isset($options['related'][$field]['conditions']) )
                                    $conditions = array_merge($options['related'][$field]['conditions'], $conditions);

                                $subquery = $sql->subquery()
                                    ->Select('*')
                                    ->From(DialectORM::tbl($class::$table))
                                    ->Where($conditions)
                                ;
                                if ( !empty($options['related'][$field]['order']) )
                                {
                                    foreach($options['related'][$field]['order'] as $ofield=>$dir)
                                        $subquery->Order($ofield, $dir);
                                }
                                if ( is_array($options['related'][$field]['limit']) )
                                    $subquery->Limit($options['related'][$field]['limit'][0], isset($options['related'][$field]['limit'][1])?$options['related'][$field]['limit'][1]:0);
                                else
                                    $subquery->Limit($options['related'][$field]['limit'], 0);

                                $selects[] = $subquery->sql();
                            }
                            $rentities = DialectORM::getDB()->get($sql->Union($selects, false)->sql());
                            foreach($rentities as $i=>$re) $rentities[$i] = new $class($re);
                        }
                        else
                        {
                            $conditions = array("$fk"=>array('in'=>$ids));
                            if ( isset($options['related'][$field]['conditions']) )
                                $conditions = array_merge($options['related'][$field]['conditions'], $conditions);
                            $rentities = $class::getAll(array(
                                'conditions' => $conditions,
                                'order' => isset($options['related'][$field]['order']) ? $options['related'][$field]['order'] : array()
                            ));
                        }
                        $map = array();
                        foreach($rentities as $re)
                        {
                            $fkv = (string)$re->get($fk);
                            if ( !isset($map[$fkv]) ) $map[$fkv] = array($re);
                            else $map[$fkv][] = $re;
                        }
                        foreach($entities as $e)
                        {
                            $kv = (string)$e->primaryKey();
                            $e->set($field, isset($map[$kv]) ? $map[$kv] : array());
                        }
                        break;
                    case 'belongsto':
                        $fk = $rel[2];
                        $rpk = $class::$pk;
                        $fids = static::pluck($entities, $fk);
                        $conditions = array("$rpk"=>array('in'=>$fids));
                        if ( isset($options['related'][$field]['conditions']) )
                            $conditions = array_merge($options['related'][$field]['conditions'], $conditions);
                        $rentities = $class::getAll(array(
                            'conditions' => $conditions,
                        ));
                        $map = array();
                        foreach($rentities as $re)
                        {
                            $map[(string)$re->primaryKey()] = $re;
                        }
                        foreach($entities as $e)
                        {
                            $fkv = (string)$e->get($fk);
                            $e->set($field, isset($map[$fkv]) ? $map[$fkv] : null, array('recurse'=>true,'merge'=>true));
                        }
                        break;
                    case 'belongstomany':
                        $ab = DialectORM::tbl($rel[4]);
                        $fk = $rel[2];
                        $pk2 = $rel[3];
                        $rpk = $class::$pk;
                        $reljoin = DialectORM::getDB()->get(
                            DialectORM::getSQL()
                                ->Select('*')
                                ->From($ab)
                                ->Where(array("$pk2"=>array('in'=>$ids)))
                                ->sql()
                        );
                        $fids = array_map(function($d)use($fk){return $d[$fk];}, $reljoin);
                        if (!empty($fids) && isset($options['related'][$field]['limit']))
                        {
                            $sql = DialectORM::getSQL();
                            $selects = array();
                            foreach($fids as $id)
                            {
                                $conditions = array("$rpk"=>$id);
                                if ( isset($options['related'][$field]['conditions']) )
                                    $conditions = array_merge($options['related'][$field]['conditions'], $conditions);

                                $subquery = $sql->subquery()
                                    ->Select('*')
                                    ->From(DialectORM::tbl($class::$table))
                                    ->Where($conditions)
                                ;
                                if ( !empty($options['related'][$field]['order']) )
                                {
                                    foreach($options['related'][$field]['order'] as $ofield=>$dir)
                                        $subquery->Order($ofield, $dir);
                                }
                                if ( is_array($options['related'][$field]['limit']) )
                                    $subquery->Limit($options['related'][$field]['limit'][0], isset($options['related'][$field]['limit'][1])?$options['related'][$field]['limit'][1]:0);
                                else
                                    $subquery->Limit($options['related'][$field]['limit'], 0);

                                $selects[] = $subquery->sql();
                            }
                            $rentities = DialectORM::getDB()->get($sql->Union($selects, false)->sql());
                            foreach($rentities as $i=>$re) $rentities[$i] = new $class($re);
                        }
                        else
                        {
                            $conditions = array(
                                "$rpk" => array('in'=>$fids)
                            );
                            if ( isset($options['related'][$field]['conditions']) )
                                $conditions = array_merge($options['related'][$field]['conditions'], $conditions);
                            $rentities = $class::getAll(array(
                                'conditions' => $conditions,
                                'order' => isset($options['related'][$field]['order']) ? $options['related'][$field]['order'] : array()
                            ));
                        }
                        $map = array();
                        foreach($rentities as $re)
                        {
                            $map[(string)$re->primaryKey()] = $re;
                        }
                        $relmap = array();
                        foreach($reljoin as $d)
                        {
                            $k1 = (string)$d[$pk2];
                            $k2 = (string)$d[$fk];
                            if (isset($map[$k2]))
                            {
                                if ( !isset($relmap[$k1]) ) $relmap[$k1] = array($map[$k2]);
                                else $relmap[$k1][] = $map[$k2];
                            }
                        }
                        foreach($entities as $e)
                        {
                            $k1 = (string)$e->primaryKey();
                            $e->set($field, !empty($relmap[$k1]) ? $relmap[$k1] : array());
                        }
                        break;
                }
            }
        }

        return $retSingle ? $entities[0] : $entities;
    }

    public static function deleteAll($options=array())
    {
        $options = array_merge(array(
            'conditions' => array(),
            'limit' => null,
            'withRelated' => false,
        ), (array)$options);

        $ids = null;
        if ( !empty($options['withRelated']) )
        {
            $ids = static::pluck(static::getAll(array('conditions'=>$options['conditions'], 'limit'=>$options['limit'])));
            foreach(static::$relationships as $field=>$rel)
            {
                $type = strtolower($rel[0]); $class = $rel[1];
                if ( 'belongsto'===$type )
                {
                    // bypass
                    continue;
                }
                elseif ( 'belongstomany'===$type )
                {
                    // delete relation from junction table
                    DialectORM::getDB()->query(
                        DialectORM::getSQL()
                            ->Delete()
                            ->From(DialectORM::tbl($rel[4]))
                            ->Where(array("{$rel[3]}"=>array('in'=>$ids)))
                            ->sql()
                    );
                }
                else
                {
                    $class::deleteAll(array(
                        'conditions' => array("{$rel[2]}"=>array('in'=>$ids)),
                        'withRelated' => true
                    ));
                }
            }
        }
        if ( is_array($ids) )
        {
            $pk = static::$pk;
            $sql = DialectORM::getSQL()
                ->Delete()
                ->From(DialectORM::tbl(static::$table))
                ->Where(array("$pk"=>array('in'=>$ids)))
            ;
        }
        else
        {
            $sql = DialectORM::getSQL()
                ->Delete()
                ->From(DialectORM::tbl(static::$table))
                ->Where($options['conditions'])
            ;
            if ( !empty($options['limit']) )
            {
                if ( is_array($options['limit']) )
                    $sql->Limit($options['limit'][0], isset($options['limit'][1])?$options['limit'][1]:0);
                else
                    $sql->Limit($options['limit'], 0);
            }
        }
        $res = DialectORM::getDB()->query($sql->sql());
        $res = $res['affectedRows'];
        return $res;
    }

    public function __construct($data = array())
    {
        $this->relations = array();
        if ( is_array($data) && !empty($data) )
            $this->_populate($data);
    }

    public function db()
    {
        return DialectORM::getDB();
    }

    public function sql()
    {
        if ( !$this->_sql ) $this->_sql = DialectORM::getSQL();
        return $this->_sql;
    }

    public function get($field, $default=null, $options=array())
    {
        if ( isset(static::$relationships[$field]) )
        {
            return $this->_getRelated($field, $default, $options);
        }
        if ( !is_array($this->data) || !array_key_exists($field, $this->data) )
        {
            if ( in_array($field, static::$fields) ) return $default;
            throw new DialectORMException('Undefined Field: "'.$field.'" in ' . get_class($this) . ' via get()', 1);
        }

        return $this->data[$field];
    }

    private function _getRelated($field, $default=null, $options=array())
    {
        $rel = null;
        if ( $field instanceof DialectORMRelation )
        {
            $rel = $field;
            $field = $rel->field;
        }
        elseif ( isset($this->relations[$field]) )
        {
            $rel = $this->relations[$field];
        }
        elseif ( isset(static::$relationships[$field]) )
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
        if ( $rel )
        {
            $options = array_merge(array(
                'conditions' => array(),
                'order' => array(),
                'limit' => null,
            ), (array)$options);

            if ( in_array($rel->type, array('hasmany','belongstomany')) && empty($default) )
                $default = array();

            if ( false === $rel->data )
            {
                switch($rel->type)
                {
                    case 'hasone':
                    case 'hasmany':
                        $class = $rel->b;
                        $fk = $rel->keyb;
                        $rel->data = 'hasone' === $rel->type ? $class::getAll(array(
                            'conditions' => array("$fk"=>$this->primaryKey()),
                            'single' => true
                        )) : $class::getAll(array(
                            'conditions' => array_merge($options['conditions'], array("$fk"=>$this->primaryKey())),
                            'order' => $options['order'],
                            'limit' => $options['limit'],
                        ));
                        if ( !empty($rel->data) && ($mirrorRel = $this->_getMirrorRel($rel)) )
                        {
                            if (is_array($rel->data))
                            {
                                foreach($rel->data as $entity)
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
                        $rel->data = $class::getByPk($this->get($rel->keyb), null);
                        if ( !empty($rel->data) && ($mirrorRel = $this->_getMirrorRel($rel)) )
                        {
                            $entity = $rel->data;
                            $entity->set($mirrorRel->field, 'hasone' === $mirrorRel->type ? $this : array($this), array('recurse'=>false,'merge'=>true));
                        }
                        break;
                    case 'belongstomany':
                        $class = $rel->b;
                        $tbl = $class::tbl($class::$table);
                        $jtbl = $class::tbl($rel->ab);
                        $pk = $tbl.'.'.$class::$pk;
                        $fk = $jtbl.'.'.$rel->keyb;
                        $fkthis = $jtbl.'.'.$rel->keya;
                        $fields = $class::$fields;
                        foreach($fields as $i=>$field) $fields[$i] = $tbl.'.'.$field.' AS '.$field;
                        $this->sql()->clear()
                            ->Select($fields)
                            ->From($tbl)
                            ->Join($jtbl, "{$pk}={$fk}", 'inner')
                            ->Where(array_merge($options['conditions'], array("$fkthis"=>$this->primaryKey())))
                        ;
                        if ( !empty($options['order']) )
                        {
                            foreach($options['order'] as $field=>$dir)
                                $this->sql()->Order($field, $dir);
                        }
                        if ( !empty($options['limit']) )
                        {
                            if ( is_array($options['limit']) )
                                $this->sql()->Limit($options['limit'][0], isset($options['limit'][1])?$options['limit'][1]:0);
                            else
                                $this->sql()->Limit($options['limit'], 0);
                        }
                        $rel->data = array_map(function($data) use ($class){
                            return new $class($data);
                        }, $this->db()->get((string)$this->sql()));
                        break;
                }
            }
            return empty($rel->data) ? $default : $rel->data;
        }
        return $default;
    }

    public function primaryKey($default=0)
    {
        return $this->get(static::$pk, $default);
    }

    public function set($field, $val=null, $options=array())
    {
        $options = array_merge(array(
            'raw' => false,
            'recurse' => true,
            'merge' => false,
        ), (array)$options);

        if ( isset(static::$relationships[$field]) )
        {
            return $this->_setRelated($field, $val, $options);
        }

        if ( !in_array($field, static::$fields) )
        {
            throw new DialectORMException('Undefined Field: "'.$field.'" in ' . get_class($this) . ' via set()', 1);
        }

        $tval = $val;
        if ( !$options['raw'] )
        {
            $fieldProp = DialectORM::camelCase($field, true);
            $typecast = 'type'.$fieldProp;
            if ( method_exists($this, $typecast) )
            {
                $tval = $this->{$typecast}($val);
            }
            $validate = 'validate'.$fieldProp;
            if ( method_exists($this, $validate) )
            {
                $valid = $this->{$validate}($tval);
                if ( !$valid ) throw new DialectORMException('Value: "'.$val.'" is not valid for Field: "'.$field.'" in '.get_class($this), 1);
            }
        }
        if ( !is_array($this->data) )
        {
            $this->data = array();
            $this->isDirty = array();
        }
        if ( !array_key_exists($field, $this->data) || ($this->data[$field] !== $tval) )
        {
            $this->isDirty[$field] = true;
            $this->data[$field] = $tval;
        }
        return $this;
    }

    private function _setRelated($field, $data, $options=array())
    {
        $rel = null;
        if ( $field instanceof DialectORMRelation )
        {
            $rel = $field;
            $field = $rel->field;
        }
        elseif ( isset($this->relations[$field]) )
        {
            $rel = $this->relations[$field];
        }
        elseif ( isset(static::$relationships[$field]) )
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
        if ( $rel )
        {
            if ( $options['merge'] && is_array($data) && is_array($rel->data) )
            {
                $pks = static::pluck($rel->data);
                foreach($data as $d)
                {
                    $dpk = $d->primaryKey();
                    // add entities that do not exist already
                    if ( empty($dpk) || !in_array($dpk, $pks) )
                    {
                        $rel->data[] = $d;
                        if (!empty($dpk)) $pks[] = $dpk;
                    }
                }
            }
            else
            {
                $rel->data = $data;
            }
            if ( $options['recurse'] && !empty($rel->data) && ($mirrorRel = $this->_getMirrorRel($rel)) )
            {
                switch($mirrorRel->type)
                {
                    case 'belongsto':
                        $pk = $this->primaryKey();
                        if (is_array($rel->data))
                        {
                            foreach($rel->data as $entity)
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
        switch($rel->type)
        {
            case 'hasone':
            case 'hasmany':
                $thisclass = get_class($this);
                $class = $rel->b;
                foreach($class::$relationships as $f=>$r)
                {
                    if ( 'belongsto'===strtolower($r[0]) && $thisclass===$r[1] && $rel->keyb===$r[2] )
                    {
                        return (object)array('type'=>'belongsto', 'field'=>$f);
                    }
                }
                break;
            case 'belongsto':
                $thisclass = get_class($this);
                $class = $rel->b;
                foreach($class::$relationships as $f=>$r)
                {
                    if ( ('hasone'===strtolower($r[0]) || 'hasmany'===strtolower($r[0])) && $thisclass===$r[1] && $rel->keyb===$r[2] )
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
        return isset(static::$relationships[$field]) && (is_array($this->data) && array_key_exists($field, $this->data));
    }

    public function assoc($field, $entity)
    {
        if ( !isset(static::$relationships[$field]) )
        {
            throw new DialectORMException('Undefined Field: "'.$field.'" in ' . get_class($this) . ' via assoc()', 1);
        }
        if ( !empty($id = $this->primaryKey()) )
        {
            $rel = static::$relationships[$field];
            $type = strtolower($rel[0]); $class = $rel[1];
            switch($type)
            {
                case 'belongstomany':
                    $jtbl = DialectORM::tbl($rel[4]);
                    $values = array();
                    foreach($entity as $ent)
                    {
                        if ( !($ent instanceof $class) ) continue;
                        $eid = $ent->primaryKey();
                        if ( empty($eid) ) continue;
                        $notexists = empty($this->db()->get(
                            $this->sql()->clear()
                                ->Select('*')
                                ->From($jtbl)
                                ->Where(array("{$rel[2]}"=>$eid, "{$rel[3]}"=>$id))
                                ->sql()
                        ));
                        if ( $notexists )
                        {
                            $values[] = array($eid, $id);
                        }
                    }
                    if ( !empty($values) )
                    {
                        $this->db()->query(
                            $this->sql()->clear()
                                ->Insert($jtbl, array($rel[2], $rel[3]))
                                ->Values($values)
                                ->sql()
                        );
                    }
                    break;
                case 'belongsto':
                    if ( ($entity instanceof $class) && !empty($entity->primaryKey()) )
                        $this->set($rel[2], $entity->primaryKey())->save();
                    break;
                case 'hasone':
                    if ( $entity instanceof $class )
                        $entity->set($rel[2], $id)->save();
                    break;
                case 'hasmany':
                    foreach($entity as $ent)
                    {
                        if ( !($ent instanceof $class) ) continue;
                        $ent->set($rel[2], $id)->save();
                    }
                    break;
            }
        }
        return $this;
    }

    public function dissoc($field, $entity)
    {
        if ( !isset(static::$relationships[$field]) )
        {
            throw new DialectORMException('Undefined Field: "'.$field.'" in ' . get_class($this) . ' via dissoc()', 1);
        }
        if ( !empty($id = $this->primaryKey()) )
        {
            $rel = static::$relationships[$field];
            $type = strtolower($rel[0]); $class = $rel[1];
            switch($type)
            {
                case 'belongstomany':
                    $jtbl = DialectORM::tbl($rel[4]);
                    $values = array();
                    foreach($entity as $ent)
                    {
                        if ( !($ent instanceof $class) ) continue;
                        $eid = $ent->primaryKey();
                        if ( empty($eid) ) continue;
                        $values[] = $eid;
                    }
                    if ( !empty($values) )
                    {
                        $this->db()->query(
                            $this->sql()->clear()
                                ->Delete()
                                ->From($jtbl)
                                ->Where(array(
                                    "{$rel[3]}" => $id,
                                    "{$rel[2]}" => array('in'=>$values)
                                ))
                                ->sql()
                        );
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
        foreach($this->relations as $rel) $rel->data = null;
        return $this;
    }

    public function beforeSave()
    {
    }

    public function afterSave($result=0)
    {
    }

    public function __call($method, $args=array())
    {
        $prefix = substr($method, 0, 3);
        if ( 'get' === $prefix )
        {
            return !empty($args) ? $this->get(DialectORM::snake_case(substr($method, 3)), $args[0], isset($args[1]) ? $args[1] : array()) : $this->get(DialectORM::snake_case(substr($method, 3)));
        }
        elseif ( 'set' === $prefix )
        {
            return $this->set(DialectORM::snake_case(substr($method, 3)), empty($args) ? null : $args[0], isset($args[1]) ? $args[1] : array());
        }
        elseif ( 'has' === $prefix )
        {
            return $this->has(DialectORM::snake_case(substr($method, 3)));
        }
        elseif ( 'assoc' === substr($method, 0, 5) )
        {
            return $this->assoc(DialectORM::snake_case(substr($method, 5)), $args[0]);
        }
        elseif ( 'dissoc' === substr($method, 0, 6) )
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
        if ( empty($data) ) return $this;

        $hydrateFromDB = !empty($data[static::$pk]);
        foreach(static::$fields as $field)
        {
            if ( array_key_exists($field, $data) )
            {
                $this->set($field, $data[$field]);
            }
            else
            {
                $hydrateFromDB = false;
                if ( !$this->has($field) )
                    $this->set($field, null);
            }
        }
        // populated from DB hydration, clear dirty flags
        if ( $hydrateFromDB ) $this->isDirty = array();
        return $this;
    }

    public function toArray($deep=false, $diff=false, $stack=array())
    {
        $class = get_class($this);
        //'RECURSION: ('.$class.', '.static::$pk.', '.$this->primaryKey().')';
        if ( in_array($class, $stack) ) return null;
        $a = array();
        foreach(static::$fields as $field)
        {
            if ( $diff && !isset($this->isDirty[$field]) ) continue;
            $a[$field] = $this->get($field);
        }
        if ( $deep && !$diff )
        {
            array_push($stack, $class);
            foreach(array_keys(static::$relationships) as $field)
            {
                if ( !isset($this->relations[$field]) || empty($this->relations[$field]->data) ) continue;

                $entity = $this->get($field);
                $data = null;

                if ( is_array($entity) )
                {
                    $data = array();
                    foreach($entity as $e)
                    {
                        $d = $e->toArray(true, false, $stack);
                        if ( !empty($d) ) $data[] = $d;
                    }
                }
                else
                {
                    $data = $entity->toArray(true, false, $stack);
                }

                if ( !empty($data) ) $a[$field] = $data;
            }
            array_pop($stack);
        }
        return $a;
    }

    public function save($options=array())
    {
        $options = array_merge(array(
            'force' => false,
            'withRelated' => false,
        ), (array)$options);

        $res = 0;

        if ( true === $options['withRelated'] ) $withRelated = array_keys(static::$relationships);
        elseif ( false === $options['withRelated'] ) $withRelated = array();
        else $withRelated = (array)$options['withRelated'];

        foreach($withRelated as $field)
        {
            if ( !isset($this->relations[$field]) ) continue;
            $rel = $this->relations[$field]; $entity = $rel->data; $class = $rel->b;
            if ( in_array($rel->type, array('belongsto')) && ($entity instanceof $class) )
            {
                $entity->save();
                $this->set($rel->keyb, $entity->primaryKey());
            }
        }

        $pk = static::$pk;
        if ( !empty($this->isDirty) )
        {
            $this->beforeSave();

            $id = $this->get($pk);
            if ( !empty($id) && !$options['force'] )
            {
                // update
                $this->sql()->clear()
                ->Update(DialectORM::tbl(static::$table))
                ->Set($this->toArray(false, true))
                ->Where(array("$pk"=>$id))
                ;
            }
            else
            {
                // insert
                $data = $this->data;
                $this->sql()->clear()
                ->Insert(DialectORM::tbl(static::$table), static::$fields)
                ->Values(array_map(function($f)use($data){return array_key_exists($f, $data) ? $data[$f] : null;}, static::$fields))
                ;
            }


            $res = $this->db()->query((string)$this->sql());
            if ( empty($id) ) $this->set($pk, $res['insertId']);
            $res = $res['affectedRows'];
            $this->isDirty = array();

            $this->afterSave($res);
        }

        $id = $this->get($pk);
        foreach($withRelated as $field)
        {
            if ( !isset($this->relations[$field]) || in_array($this->relations[$field]->type, array('belongsto')) ) continue;
            $rel = $this->relations[$field]; $class = $rel->b;
            if ( !empty($rel->data) )
            {
                if ( is_array($rel->data) )
                {
                    if ( 'hasmany'===$rel->type )
                    {
                        foreach($rel->data as $entity)
                        {
                            if ( $entity instanceof $class )
                                $entity->set($rel->keyb, $id);
                        }
                    }
                    foreach($rel->data as $entity)
                    {
                        if ( $entity instanceof $class )
                            $entity->save();
                    }
                }
                else
                {
                    $entity = $rel->data;
                    if ( 'hasone'===$rel->type )
                    {
                        if ( $entity instanceof $class )
                            $entity->set($rel->keyb, $id);
                    }
                    if ( $entity instanceof $class )
                        $entity->save();
                }
                if ( 'belongstomany'===$rel->type )
                {
                    $jtbl = DialectORM::tbl($rel->ab);
                    $entities = (array)$rel->data;
                    $values = array();
                    foreach($entities as $entity)
                    {
                        if ( !($entity instanceof $class) ) continue;
                        $eid = $entity->primaryKey();
                        if ( empty($eid) ) continue;
                        // the most cross-platform way seems to do an extra select to check if relation already exists
                        // https://stackoverflow.com/questions/13041023/insert-on-duplicate-key-update-nothing-using-mysql/13041065
                        $notexists = empty($this->db()->get(
                            $this->sql()->clear()
                                ->Select('*')
                                ->From($jtbl)
                                ->Where(array("{$rel->keyb}"=>$eid, "{$rel->keya}"=>$id))
                                ->sql()
                        ));
                        if ( $notexists )
                        {
                            $values[] = array($eid, $id);
                        }
                    }
                    if ( !empty($values) )
                    {
                        $this->db()->query(
                            $this->sql()->clear()
                                ->Insert($jtbl, array($rel->keyb, $rel->keya))
                                ->Values($values)
                                ->sql()
                        );
                    }
                }
            }
        }

        return $res;
    }

    public function delete($options=array())
    {
        $options = array_merge(array(
            'withRelated' => false,
        ), (array)$options);

        $res = 0;

        if ( is_array($this->data) )
        {
            $pk = static::$pk;
            $id = $this->get($pk);
            if ( !empty($id) )
            {
                // delete
                $res = static::deleteAll(array(
                    'conditions' => array("$pk"=>$id),
                    'withRelated' => $options['withRelated']
                ));
            }
            $this->clear();
        }

        return $res;
    }
}
}