/**
*   DialectORM,
*   a tiny, fast, super-simple but versatile Object-Relational-Mapper w/ Relationships for PHP, JavaScript, Python
*
*   @version: 1.0.0
*   https://github.com/foo123/DialectORM
**/
!function( root, name, factory ){
"use strict";
if ( ('object'===typeof module)&&module.exports ) /* CommonJS */
    (module.$deps = module.$deps||{}) && (module.exports = module.$deps[name] = factory.call(root));
else if ( ('function'===typeof define)&&define.amd&&('function'===typeof require)&&('function'===typeof require.specified)&&require.specified(name) /*&& !require.defined(name)*/ ) /* AMD */
    define(name,['module'],function(module){factory.moduleUri = module.uri; return factory.call(root);});
else if ( !(name in root) ) /* Browser/WebWorker/.. */
    (root[name] = factory.call(root)||1)&&('function'===typeof(define))&&define.amd&&define(function(){return root[name];} );
}(  /* current root */          'undefined' !== typeof self ? self : this,
    /* module name */           "DialectORM",
    /* module factory */        function ModuleFactory__DialectORM( undef ){
"use strict";

function esc_re(s)
{
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
function ucfirst(s)
{
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function lcfirst(s)
{
    return s.charAt(0).toLowerCase() + s.slice(1);
}
function is_string(arg)
{
    return Object.prototype.toString.call(arg) === '[object String]';
}
function is_array(arg)
{
    return Object.prototype.toString.call(arg) === '[object Array]';
}
function is_obj(arg)
{
    return Object.prototype.toString.call(arg) === '[object Object]';
}
function empty(arg)
{
    if (is_string(arg)) return ('0' === arg) || (0 === arg.length);
    if (is_array(arg)) return (0 === arg.length);
    if (is_obj(arg)) return (0 === Object.keys(arg).length);
    return !arg;
}
function has(o, k)
{
    return is_array(o) ? (0 <= o.indexOf(k)) : (Object.prototype.hasOwnProperty.call(o, k));
}
function merge(/*args*/)
{
    let o = arguments[0] || {}, n = arguments.length, i = 1, o2, k;
    while (i<n)
    {
        o2 = arguments[i++];
        for (k in o2)
        {
            if (has(o2, k))
                o[k] = o2[k];
        }
    }
    return o;
}
function NotImplemented()
{
    return new Error('Not Implemented!');
}

var magicMethodsProxy = {
    get: function(target, prop, receiver)  {
        var proxy = this;

        // Does prop exists? Is it a method?
        if ('function' === typeof(target[prop]))
        {
            // Wrap it around a function and return it
            return function(...args) {
                // in order to preserve the default arguments the method may have, we pass undefined
                // instead of an empty arguments object
                var value = target[prop].apply(target, (args.length ? args : undefined));
                // it is important to return the proxy instead of the target in order to make
                // future calls to this method
                return value === target ? proxy : value;
            };
        }

        // Does prop exists?
        if (undefined != target[prop])
        {
            return target[prop];
        }

        prop = String(prop);
        // Falls to __call
        if (
            'function' === typeof(target.__call) &&
            // only these magic methods
            ('get'===prop.slice(0,3) || 'set'===prop.slice(0,3) || 'has'===prop.slice(0,3) || 'assoc'===prop.slice(0,5) || 'dissoc'===prop.slice(0,6))
        )
        {
            return function(...args) {
                var value = target.__call(prop, args, proxy);
                // it is important to return the proxy instead of the target in order to make
                // future calls to this method
                return value === target ? proxy : value;
            };
        }
    }
};

var Dialect = null

// interface
class IDialectORMDb
{
    vendor() { throw NotImplemented(); }
    escape(str) { throw NotImplemented(); }
    escapeWillQuote() { throw NotImplemented(); }
    query(sql) { throw NotImplemented(); }
    get(sql) { throw NotImplemented(); }
}

class DialectORMException extends Error
{
    constructor(message)
    {
        super(message);
        this.name = "DialectORMException";
    }
}


class DialectORMRelation
{
    type = '';
    a = null;
    b = null;
    keya = null;
    keyb = null;
    ab = null;
    field = null;
    data = false;

    constructor(type, a, b, kb, ka=null, ab=null)
    {
        this.type = String(type).toLowerCase();
        this.a = a;
        this.b = b;
        this.keya = ka || null;
        this.keyb = kb;
        this.ab = ab || null;
        this.field = null;
        this.data = false;
    }
}

class DialectORM
{
    static table = null;
    static pk = null;
    static fields = [];
    static relationships = {};

    static pluck(entities, field='')
    {
        if (''===field)
            return entities.map(entity => entity.primaryKey());
        else
            return entities.map(entity => entity.get(field));
    }

    static sorter(args=[])
    {
        // Array multi - sorter utility
        // returns a sorter that can (sub-)sort by multiple (nested) fields
        // each ascending or descending independantly
        var klass = this, i, /*args = arguments,*/ l = args.length,
            a, b, avar, bvar, variables, step, lt, gt,
            field, filter_args, sorter_args, desc, dir, sorter;
        // + before a (nested) field indicates ascending sorting (default),
        // example "+a.b.c"
        // - before a (nested) field indicates descending sorting,
        // example "-b.c.d"
        if ( l )
        {
            step = 1;
            sorter = [];
            variables = [];
            sorter_args = [];
            filter_args = [];
            for (i=l-1; i>=0; i--)
            {
                field = args[i];
                // if is array, it contains a filter function as well
                filter_args.unshift('f'+String(i));
                if ( is_array(field) )
                {
                    sorter_args.unshift(field[1]);
                    field = field[0];
                }
                else
                {
                    sorter_args.unshift(null);
                }
                dir = field.charAt(0);
                if ( '-' === dir )
                {
                    desc = true;
                    field = field.slice(1);
                }
                else if ( '+' === dir )
                {
                    desc = false;
                    field = field.slice(1);
                }
                else
                {
                    // default ASC
                    desc = false;
                }
                field = field.length ? field.split('.').map(f => !f.length ? '' : (/^\d+$/.test(f) ? ('['+f+']') : ('.get'+DialectORM.camelCase(f, true)+'()'))).join('')/*'["' + field.split('.').join('"]["') + '"]'*/ : '';
                a = "a"+field; b = "b"+field;
                if ( sorter_args[0] )
                {
                    a = filter_args[0] + '(' + a + ')';
                    b = filter_args[0] + '(' + b + ')';
                }
                avar = 'a_'+String(i); bvar = 'b_'+String(i);
                variables.unshift(''+avar+'='+a+','+bvar+'='+b+'');
                lt = desc ?(''+step):('-'+step); gt = desc ?('-'+step):(''+step);
                sorter.unshift("("+avar+" < "+bvar+" ? "+lt+" : ("+avar+" > "+bvar+" ? "+gt+" : 0))");
                step <<= 1;
            }
            // use optional custom filters as well
            return (new Function(
                    filter_args.join(','),
                    ['return function(a,b) {',
                     '  var '+variables.join(',')+';',
                     '  return '+sorter.join('+')+';',
                     '};'].join("\n")
                    ))
                    .apply(null, sorter_args);
        }
        else
        {
            a = "a"; b = "b"; lt = '-1'; gt = '1';
            sorter = ""+a+" < "+b+" ? "+lt+" : ("+a+" > "+b+" ? "+gt+" : 0)";
            return new Function("a,b", 'return '+sorter+';');
        }
    }

    static async fetchByPk(id, default_=null)
    {
        let klass = this, conditions = {}, entity;
        conditions[klass.pk] = id;
        entity = await DialectORM.DBHandler().get(
            DialectORM.SQLBuilder().Select(
                    klass.fields
                ).From(
                    DialectORM.tbl(klass.table)
                ).Where(
                    conditions
                ).sql()
        );
        return !empty(entity) ? new klass(is_array(entity) ? entity[0] : entity) : default_;
    }

    static async count(options={})
    {
        let klass = this, sql, res;
        options = merge({'conditions' : {}}, options);
        sql = DialectORM.SQLBuilder().Select(
            'COUNT(*) AS cnt'
            ).From(
                DialectORM.tbl(klass.table)
            ).Where(
                options['conditions']
            );

        res = await DialectORM.DBHandler().get(sql.sql());
        return res[0]['cnt'];
    }

    static async fetchAll(options={}, default_=[])
    {
        let klass = this, pk = klass.pk, field, entities,
            retSingle, sql, i, ids, f, rel, type, cls,
            fk, rpk, fids, conditions, rentities, mapp, relmapp, e, re,
            fkv, kv, k1, k2, d, ab, pk2, reljoin, subquery, selects, ofield;
        options = merge({
            'conditions': {},
            'order': {},
            'limit': null,
            'single': false,
            'withRelated': [],
            'related': {},
        }, options);

        retSingle = options['single'];
        if (retSingle && empty(default_))
            default_ = null;

        sql = DialectORM.SQLBuilder().Select(
                klass.fields
            ).From(
                DialectORM.tbl(klass.table)
            ).Where(
                options['conditions']
            );

        if (!empty(options['order']))
        {
            for (field in options['order'])
                if (has(options['order'], field))
                    sql.Order(field, options['order'][field]);
        }

        if (null != options['limit'])
        {
            if (is_array(options['limit']))
                sql.Limit(options['limit'][0], 1<options['limit'].length ? options['limit'][1] : 0);
            else
                sql.Limit(options['limit'], 0);
        }
        else if (retSingle)
        {
            sql.Limit(1, 0);
        }

        entities = await DialectORM.DBHandler().get(sql.sql());
        if (empty(entities)) return default_;

        for (i = 0; i < entities.length; i++)
            entities[i] = new klass(entities[i]);

        if (!empty(options['withRelated']))
        {
            // eager optimised (no N+1 issue) loading of selected relations
            ids = klass.pluck(entities);
            for (f = 0; f < options['withRelated'].length; f++)
            {
                field = String(options['withRelated'][f]);
                if (!has(klass.relationships, field)) continue;
                rel = klass.relationships[field];
                type = rel[0].toLowerCase();
                cls = rel[1];
                if ('hasone'===type)
                {
                    fk = rel[2];
                    conditions = {};
                    conditions[fk] = {'in':ids};
                    if (has(options['related'], field) && has(options['related'][field], 'conditions'))
                    {
                        conditions = merge({}, options['related'][field]['conditions'], conditions);
                    }
                    rentities = await cls.fetchAll({
                        'conditions' : conditions
                    });
                    mapp = {};
                    for (re = 0; re < rentities.length; re++)
                    {
                        mapp[String(rentities[re].get(fk))] = rentities[re];
                    }
                    for (e = 0; e < entities.length; e++)
                    {
                        kv = String(entities[e].primaryKey());
                        entities[e].set(field, has(mapp, kv) ? mapp[kv] : null);
                    }
                }
                else if ('hasmany'===type)
                {
                    fk = rel[2];
                    if (has(options['related'], field) && has(options['related'][field], 'limit'))
                    {
                        sql = DialectORM.SQLBuilder();
                        selects = [];
                        for (i = 0; i < ids.length; i++)
                        {
                            conditions = {};
                            conditions[fk] = ids[i];
                            if (has(options['related'], field) && has(options['related'][field], 'conditions'))
                                conditions = merge({}, options['related'][field]['conditions'], conditions);

                            subquery = sql.subquery().Select(
                                cls.fields
                            ).From(
                                DialectORM.tbl(cls.table)
                            ).Where(
                                conditions
                            );
                            if (!empty(options['related'][field]['order']))
                            {
                                for (ofield in options['related'][field]['order'])
                                    if (has(options['related'][field]['order'], ofield))
                                        subquery.Order(ofield, options['related'][field]['order'][ofield]);
                            }

                            if (is_array(options['related'][field]['limit']))
                                subquery.Limit(options['related'][field]['limit'][0], 1<options['related'][field]['limit'].length ? options['related'][field]['limit'][1] : 0);
                            else
                                subquery.Limit(options['related'][field]['limit'], 0);

                            selects.push(subquery.sql());
                        }

                        rentities = await DialectORM.DBHandler().get(sql.Union(selects, false).sql());
                        for (i = 0; i < rentities.length; i++)
                            rentities[i] = new cls(rentities[i]);
                    }
                    else
                    {
                        conditions = {};
                        conditions[fk] = {'in':ids};
                        if (has(options['related'], field) && has(options['related'][field], 'conditions'))
                        {
                            conditions = merge({}, options['related'][field]['conditions'], conditions);
                        }
                        rentities = await cls.fetchAll({
                            'conditions' : conditions,
                            'order' : has(options['related'], field) && has(options['related'][field], 'order') ? options['related'][field]['order'] : {}
                        });
                    }
                    mapp = {};
                    for (re = 0; re < rentities.length; re++)
                    {
                        fkv = String(rentities[re].get(fk));
                        if (!has(mapp, fkv)) mapp[fkv] = [rentities[re]];
                        else mapp[fkv].push(rentities[re]);
                    }
                    for (e = 0; e < entities.length; e++)
                    {
                        kv = String(entities[e].primaryKey());
                        entities[e].set(field, has(mapp, kv) ? mapp[kv] : []);
                    }
                }
                else if ('belongsto'===type)
                {
                    fk = rel[2];
                    rpk = cls.pk;
                    fids = klass.pluck(entities, fk);
                    conditions = {};
                    conditions[rpk] = {'in':fids};
                    if (has(options['related'], field) && has(options['related'][field], 'conditions'))
                    {
                        conditions = merge({}, options['related'][field]['conditions'], conditions);
                    }
                    rentities = await cls.fetchAll({
                        'conditions' : conditions
                    });
                    mapp = {};
                    for (re = 0; re < rentities.length; re++)
                    {
                        mapp[String(rentities[re].primaryKey())] = rentities[re];
                    }
                    for (e = 0; e < entities.length; e++)
                    {
                        fkv = String(entities[e].get(fk));
                        entities[e].set(field, has(mapp, fkv) ? mapp[fkv] : null, {'recurse':true,'merge':true});
                    }
                }
                else if ('belongstomany'===type)
                {
                    ab = DialectORM.tbl(rel[4]);
                    fk = rel[2];
                    pk2 = rel[3];
                    rpk = cls.pk;
                    conditions = {};
                    conditions[pk2] = {'in':ids};
                    reljoin = await DialectORM.DBHandler().get(
                        DialectORM.SQLBuilder().Select(
                            '*'
                        ).From(
                            ab
                        ).Where(
                            conditions
                        ).sql()
                    );
                    fids = reljoin.map(d => d[fk]);
                    if (!empty(fids) && has(options['related'], field) && has(options['related'][field], 'limit'))
                    {
                        sql = DialectORM.SQLBuilder();
                        selects = [];
                        for (i = 0; i < fids.length; i++)
                        {
                            conditions = {};
                            conditions[rpk] = fids[i];
                            if (has(options['related'], field) && has(options['related'][field], 'conditions'))
                                conditions = merge({}, options['related'][field]['conditions'], conditions);

                            subquery = sql.subquery().Select(
                                cls.fields
                            ).From(
                                DialectORM.tbl(cls.table)
                            ).Where(
                                conditions
                            );
                            if (!empty(options['related'][field]['order']))
                            {
                                for (ofield in options['related'][field]['order'])
                                    if (has(options['related'][field]['order'], ofield))
                                        subquery.Order(ofield, options['related'][field]['order'][ofield]);
                            }

                            if (is_array(options['related'][field]['limit']))
                                subquery.Limit(options['related'][field]['limit'][0], 1<options['related'][field]['limit'].length ? options['related'][field]['limit'][1] : 0);
                            else
                                subquery.Limit(options['related'][field]['limit'], 0);

                            selects.push(subquery.sql());
                        }

                        rentities = await DialectORM.DBHandler().get(sql.Union(selects, false).sql());
                        for (i = 0; i < rentities.length; i++)
                            rentities[i] = new cls(rentities[i]);
                    }
                    else
                    {
                        conditions = {};
                        conditions[rpk] = {'in':fids};
                        if (has(options['related'], field) && has(options['related'][field], 'conditions'))
                        {
                            conditions = merge({}, options['related'][field]['conditions'], conditions);
                        }
                        rentities = await cls.fetchAll({
                            'conditions' : conditions,
                            'order' : has(options['related'], field) && has(options['related'][field], 'order') ? options['related'][field]['order'] : {}
                        });
                    }
                    mapp = {};
                    for (re = 0; re < rentities.length; re++)
                    {
                        mapp[String(rentities[re].primaryKey())] = rentities[re];
                    }
                    relmapp = {};
                    for (d = 0; d < reljoin.length; d++)
                    {
                        k1 = String(reljoin[d][pk2]);
                        k2 = String(reljoin[d][fk]);
                        if (has(mapp, k2))
                        {
                            if (!has(relmapp, k1)) relmapp[k1] = [mapp[k2]];
                            else relmapp[k1].push(mapp[k2]);
                        }
                    }
                    for (e = 0; e < entities.length; e++)
                    {
                        k1 = String(entities[e].primaryKey());
                        entities[e].set(field, has(relmapp, k1) ? relmapp[k1] : []);
                    }
                }
            }
        }
        return retSingle ? entities[0] : entities;
    }

    static async delAll(options={})
    {
        let klass = this, pk, ids, field, sql, res, rel, type, cls, conditions;
        options = merge({
            'conditions' : {},
            'limit' : null,
            'withRelated' : false
        }, options);

        ids = null;
        if (!empty(options['withRelated']))
        {
            ids = klass.pluck(await klass.fetchAll({'conditions':options['conditions'], 'limit':options['limit']}));
            for (field in klass.relationships)
            {
                if (!has(klass.relationships, field)) continue;
                rel = klass.relationships[field];
                type = rel[0].toLowerCase();
                cls = rel[1];
                if ('belongsto'===type)
                {
                    // bypass
                }
                else if ('belongstomany'===type)
                {
                    // delete relation from junction table
                    conditions = {};
                    conditions[rel[3]] = {'in':ids};
                    await DialectORM.DBHandler().query(
                        DialectORM.SQLBuilder().Delete(
                            ).From(
                                DialectORM.tbl(rel[4])
                            ).Where(
                                conditions
                            ).sql()
                    );
                }
                else
                {
                    conditions = {};
                    conditions[rel[2]] = {'in':ids};
                    await cls.delAll({
                        'conditions' : conditions,
                        'withRelated' : true
                    });
                }
            }
        }
        if (is_array(ids))
        {
            pk = klass.pk;
            conditions = {};
            conditions[pk] = {'in':ids};
            sql = DialectORM.SQLBuilder().Delete(
                ).From(
                    DialectORM.tbl(klass.table)
                ).Where(
                    conditions
                );
        }
        else
        {
            sql = DialectORM.SQLBuilder().Delete(
                ).From(
                    DialectORM.tbl(klass.table)
                ).Where(
                    options['conditions']
                );
            if (null != options['limit'])
            {
                if (is_array(options['limit']))
                    sql.Limit(options['limit'][0], 1<options['limit'].length ? options['limit'][1] : 0);
                else
                    sql.Limit(options['limit'], 0);
            }
        }
        res = await DialectORM.DBHandler().query(sql.sql());
        res = res['affectedRows'];
        return res;
    }

    _sql = null;
    relations = null;
    data = null;
    isDirty = null;
    proxy = null;

    constructor(data={})
    {
        this._sql = null;
        this.relations = {};
        this.data = null;
        this.isDirty = null;

        if (is_obj(data) && !empty(data))
            this._populate(data);

        // return the proxy
        this.proxy = new Proxy(this, magicMethodsProxy);
        return this.proxy;
    }

    db()
    {
        return DialectORM.DBHandler();
    }

    sql()
    {
        if (!this._sql) this._sql = DialectORM.SQLBuilder();
        return this._sql;
    }

    get(field, default_=null, options={})
    {
        field = String(field);
        let klass = this.constructor;
        if (has(klass.relationships, field))
        {
            return this._getRelated(field, default_, options);
        }
        if (!is_obj(this.data) || !has(this.data, field))
        {
            if (has(klass.fields, field)) return default_;
            throw new DialectORM.Exception('Undefined Field: "'+field+'" in ' + klass.name + ' via get()');
        }

        return this.data[field];
    }

    _getRelated(field, default_=null, options={})
    {
        let klass = this.constructor, rel = null,
            type, a, b, kb, ka, ab, cls, mirrorRel, entity, fk, conditions, i,
            tbl, jtbl, pk, fkthis, fields;
        if (field instanceof DialectORM.Relation)
        {
            rel = field;
            field = rel.field;
        }
        else if (has(this.relations, field))
        {
            rel = this.relations[field];
        }
        else if (has(klass.relationships, field))
        {
            type = klass.relationships[field][0];
            a = klass;
            b = klass.relationships[field][1];
            kb = klass.relationships[field][2];
            ka = 3<klass.relationships[field].length ? klass.relationships[field][3] : null;
            ab = 4<klass.relationships[field].length ? klass.relationships[field][4] : null;
            rel = new DialectORM.Relation(type, a, b, kb, ka, ab);
            rel.field = field;
            this.relations[field] = rel;
        }

        if (rel)
        {
            options = merge({
                'conditions' : {},
                'order' : {},
                'limit' : null
            }, options);

            if (has(['hasmany','belongstomany'], rel.type) && empty(default_))
                default_ = [];

            if (false === rel.data)
            {
                return new Promise((resolve, reject) => {
                    if ('hasone'===rel.type || 'hasmany'===rel.type)
                    {
                        cls = rel.b;
                        fk = rel.keyb;
                        if ('hasone'===rel.type)
                        {
                            conditions = {};
                            conditions[fk] = this.primaryKey();
                            cls.fetchAll({
                                'conditions' : conditions,
                                'single' : true
                            }).then(res => {
                                rel.data = res;
                                if (!empty(rel.data))
                                {
                                    mirrorRel = this._getMirrorRel(rel);
                                    if (mirrorRel)
                                    {
                                        entity = rel.data;
                                        //entity.set(rel.key, this.primaryKey());
                                        entity.set(mirrorRel.field, this.proxy, {'recurse':false});
                                    }
                                }
                                resolve(empty(rel.data) ? default_ : rel.data);
                            });
                        }
                        else
                        {
                            conditions = merge({}, options['conditions']);
                            conditions[fk] = this.primaryKey();
                            cls.fetchAll({
                                'conditions' : conditions,
                                'order' : options['order'],
                                'limit' : options['limit']
                            }).then(res => {
                                rel.data = res;
                                if (!empty(rel.data))
                                {
                                    mirrorRel = this._getMirrorRel(rel);
                                    if (mirrorRel)
                                    {
                                        for (i = 0; i < rel.data.length; i++)
                                        {
                                            entity = rel.data[i];
                                            //entity.set(rel.key, this.primaryKey());
                                            entity.set(mirrorRel.field, this.proxy, {'recurse':false});
                                        }
                                    }
                                }
                                resolve(empty(rel.data) ? default_ : rel.data);
                            });
                        }
                    }
                    else if ('belongsto'===rel.type)
                    {
                        cls = rel.b;
                        cls.fetchByPk(this.get(rel.keyb), null).then(res => {
                            rel.data = res;
                            if (!empty(rel.data))
                            {
                                mirrorRel = this._getMirrorRel(rel);
                                if (mirrorRel)
                                {
                                    entity = rel.data;
                                    entity.set(mirrorRel.field, 'hasone'===mirrorRel.type ? this.proxy : [this.proxy], {'recurse':false,'merge':true});
                                }
                            }
                            resolve(empty(rel.data) ? default_ : rel.data);
                        });
                    }
                    else if ('belongstomany'===rel.type)
                    {
                        cls = rel.b;
                        tbl = DialectORM.tbl(cls.table);
                        jtbl = DialectORM.tbl(rel.ab);
                        pk = tbl+'.'+cls.pk;
                        fk = jtbl+'.'+rel.keyb;
                        fkthis = jtbl+'.'+rel.keya;
                        fields = cls.fields;
                        for (i = 0; i < fields.length; i++) fields[i] = tbl+'.'+fields[i]+' AS '+fields[i];
                        conditions = merge({}, options['conditions']);
                        conditions[fkthis] = this.primaryKey();
                        this.sql().clear().Select(
                            fields
                        ).From(
                            tbl
                        ).Join(
                            jtbl, pk+'='+fk, 'inner'
                        ).Where(
                            conditions
                        );

                        if (!empty(options['order']))
                        {
                            for (field in options['order'])
                                if (has(options['order'], field))
                                    this.sql().Order(field, options['order'][field]);
                        }

                        if (null != options['limit'])
                        {
                            if (is_array(options['limit']))
                                this.sql().Limit(options['limit'][0], 1<options['limit'].length ? options['limit'][1] : 0);
                            else
                                this.sql().Limit(options['limit'], 0);
                        }

                        this.db().get(String(this.sql())).then(res => {
                            rel.data = res.map(data => new cls(data));
                            resolve(empty(rel.data) ? default_ : rel.data);
                        });
                    }
                    else
                    {
                        resolve(default_);
                    }
                });
            }
            else
            {
                return empty(rel.data) ? default_ : rel.data;
            }
        }

        return default_;
    }

    primaryKey(default_=0)
    {
        let klass = this.constructor;
        return this.get(klass.pk, default_);
    }

    set(field, val=null, options={})
    {
        let klass = this.constructor, tval, fieldProp, typecast, validate, valid;
        field = String(field);
        options = merge({
            'raw' : false,
            'recurse' : true,
            'merge' : false
        }, options);

        if (has(klass.relationships, field))
            return this._setRelated(field, val, options);

        if (!has(klass.fields, field))
            throw new DialectORM.Exception('Undefined Field: "'+field+'" in ' + klass.name + ' via set()');

        tval = val;
        if (!options['raw'])
        {
            fieldProp = DialectORM.camelCase(field, true);

            typecast = 'type'+fieldProp;
            if ('function' === typeof(this[typecast]))
            {
                tval = this[typecast](val);
            }

            validate = 'validate'+fieldProp;
            if ('function' === typeof(this[validate]))
            {
                valid = this[validate](tval);
                if (!valid) throw new DialectORM.Exception('Value: "'+String(val)+'" is not valid for Field: "'+field+'" in '+klass.name);
            }
        }

        if (!this.data)
        {
            this.data = Object.create(null);
            this.isDirty = Object.create(null);
        }
        if (!has(this.data, field) || (this.data[field] !== tval))
        {
            this.isDirty[field] = true;
            this.data[field] = tval;
        }
        return this
    }

    _setRelated(field, data, options={})
    {
        let klass = this.constructor, rel = null,
            type, a, b, kb, ka, ab, pks, i, dpk, mirrorRel, pk, entity;
        if (field instanceof DialectORM.Relation)
        {
            rel = field;
            field = rel.field;
        }
        else if (has(this.relations, field))
        {
            rel = this.relations[field];
        }
        else if (has(klass.relationships, field))
        {
            type = klass.relationships[field][0];
            a = klass;
            b = klass.relationships[field][1];
            kb = klass.relationships[field][2];
            ka = 3<klass.relationships[field].length ? klass.relationships[field][3] : null;
            ab = 4<klass.relationships[field].length ? klass.relationships[field][4] : null;
            rel = new DialectORM.Relation(type, a, b, kb, ka, ab);
            rel.field = field;
            this.relations[field] = rel;
        }

        if (rel)
        {
            if (options['merge'] && is_array(data) && is_array(rel.data))
            {
                pks = klass.pluck(rel.data);
                for (i = 0; i < data.length; i++)
                {
                    dpk = data[i].primaryKey();
                    // add entities that do not exist already
                    if (empty(dpk) || !has(pks, dpk))
                    {
                        rel.data.push(data[i]);
                        if (!empty(dpk)) pks.push(dpk);
                    }
                }
            }
            else
            {
                rel.data = data;
            }

            if (options['recurse'] && !empty(rel.data))
            {
                mirrorRel = this._getMirrorRel(rel);
                if (mirrorRel)
                {
                    if ('belongsto'===mirrorRel.type)
                    {
                        pk = this.primaryKey();
                        if (is_array(rel.data))
                        {
                            for (i = 0; i < rel.data.length; i++)
                            {
                                entity = rel.data[i];
                                entity.set(rel.keyb, pk);
                                entity.set(mirrorRel.field, this.proxy, {'recurse':false});
                            }
                        }
                        else
                        {
                            entity = rel.data;
                            entity.set(rel.keyb, pk);
                            entity.set(mirrorRel.field, this.proxy, {'recurse':false});
                        }
                    }
                    else if ('hasone'===mirrorRel.type)
                    {
                        entity = rel.data;
                        entity.set(mirrorRel.field, this.proxy, {'recurse':false});
                    }
                    else if ('hasmany'===mirrorRel.type)
                    {
                        entity = rel.data;
                        entity.set(mirrorRel.field, [this.proxy], {'recurse':false,'merge':true});
                    }
                }
            }
        }

        return this;
    }

    _getMirrorRel(rel)
    {
        let thisclass, cls, f, r;
        if ('hasone'===rel.type || 'hasmany'===rel.type)
        {
            thisclass = this.constructor;
            cls = rel.b;
            for (f in cls.relationships)
            {
                if (!has(cls.relationships, f)) continue;
                r = cls.relationships[f];
                if ('belongsto'===r[0].toLowerCase() && thisclass===r[1] && rel.keyb===r[2])
                    return {'type':'belongsto', 'field':f};
            }
        }
        else if ('belongsto'===rel.type)
        {
            thisclass = this.constructor;
            cls = rel.b;
            for (f in cls.relationships)
            {
                if (!has(cls.relationships, f)) continue;
                r = cls.relationships[f];
                if (('hasone'===r[0].toLowerCase() || 'hasmany'===r[0].toLowerCase()) && thisclass===r[1] && rel.keyb===r[2])
                    return {'type':r[0].toLowerCase(), 'field':f};
            }
        }

        return null;
    }

    has(field)
    {
        field = String(field);
        let klass = this.constructor;
        return !has(klass.relationships, field) && (null != this.data) && has(this.data, field);
    }

    async assoc(field, entity)
    {
        let klass = this.constructor, id, rel, type, cls, jtbl, values, i, ent, eid, eids, conditions, exists;
        field = String(field);
        if (!has(klass.relationships, field))
            throw new DialectORM.Exception('Undefined Field: "'+field+'" in ' + klass.name + ' via assoc()');
        id = this.primaryKey();
        if (!empty(id))
        {
            rel = klass.relationships[field];
            type = rel[0].toLowerCase();
            cls = rel[1];
            if ('belongstomany'===type)
            {
                jtbl = TnyORM.tbl(rel[4]);
                eids = [];
                for (i = 0; i < entity.length; i++)
                {
                    ent = entity[i];
                    if (!(ent instanceof cls)) continue;
                    eid = ent.primaryKey();
                    if (empty(eid)) continue;
                    eids.push(eid);
                }

                conditions = {};
                conditions[rel[2]] = {'in':eids};
                conditions[rel[3]] = id;
                exists = (empty(eids) ? [] : (await this.db().get(
                    this.sql().clear().Select(
                        rel[2]
                    ).From(
                        jtbl
                    ).Where(
                        conditions
                    ).sql()
                ))).map(v => String(v[rel[2]]));

                values = [];
                for (i = 0; i < entity.length; i++)
                {
                    ent = entity[i];
                    if (!(ent instanceof cls)) continue;
                    eid = ent.primaryKey();
                    if (empty(eid)) continue;
                    if (!has(exists, String(eid)))
                    {
                        exists.push(String(eid));
                        values.push([eid, id]);
                    }
                }

                if (!empty(values))
                {
                    await this.db().query(
                        this.sql().clear().Insert(
                            jtbl, [rel[2], rel[3]]
                        ).Values(
                            values
                        ).sql()
                    );
                }
            }
            else if ('belongsto'===type)
            {
                if ( (entity instanceof cls) && !empty(entity.primaryKey()) )
                    await this.set(rel[2], entity.primaryKey()).save();
            }
            else if ('hasone'===type)
            {
                if ( entity instanceof cls )
                    await entity.set(rel[2], id).save();
            }
            else if ('hasmany'===type)
            {
                for (i = 0; i < entity.length; i++)
                {
                    ent = entity[i];
                    if (!(ent instanceof cls)) continue;
                    await ent.set(rel[2], id).save();
                }
            }
        }
        return this.proxy;
    }

    async dissoc(field, entity)
    {
        let klass = this.constructor, id, rel, type, cls, jtbl, values, i, ent, eid, conditions, notexists;
        field = String(field);
        if (!has(klass.relationships, field))
            throw new DialectORM.Exception('Undefined Field: "'+field+'" in ' + klass.name + ' via dissoc()');

        id = this.primaryKey();
        if (!empty(id))
        {
            rel = klass.relationships[field];
            type = rel[0].toLowerCase();
            cls = rel[1];
            if ('belongstomany'===type)
            {
                jtbl = DialectORM.tbl(rel[4]);
                values = [];
                for (i = 0; i < entity.length; i++)
                {
                    ent = entity[i];
                    if (!(ent instanceof cls)) continue;
                    eid = ent.primaryKey();
                    if (empty(eid)) continue;
                    values.push(eid);
                }
                if (!empty(values))
                {
                    conditions = {}
                    conditions[rel[3]] = id;
                    conditions[rel[2]] = {'in':values};
                    await this.db().query(
                        this.sql().clear().Delete(
                        ).From(
                            jtbl
                        ).Where(
                            conditions
                        ).sql()
                    );
                }
            }
            else if ('belongsto'===type)
            {
                //pass
            }
            else if ('hasone'===type)
            {
                //pass
            }
            else if ('hasmany'===type)
            {
                //pass
            }
        }
        return this.proxy;
    }

    clear()
    {
        this.data = null;
        this.isDirty = null;
        for (rel in this.relations)
            if (has(this.relations, rel))
                this.relations[rel].data = null;
        return this
    }

    beforeSave()
    {
        //pass
    }

    afterSave(result=0)
    {
        //pass
    }

    // magic method calls simulated
    __call(method, args, proxy)
    {
        let prefix = method.slice(0,3), field;
        if ('get' === prefix)
        {
            field = DialectORM.snake_case(method.slice(3));
            return args.length ? this.get(field, args[0], 1<args.length ? args[1] : {}) : this.get(field);
        }

        else if ('set' === prefix)
        {
            field = DialectORM.snake_case(method.slice(3));
            return this.set(field, !args.length ? null : args[0], 1<args.length ? args[1] : {});
        }

        else if ('has' === prefix)
        {
            field = DialectORM.snake_case(method.slice(3));
            return this.has(field);
        }

        else if ('assoc' === method.slice(0,5))
        {
            field = DialectORM.snake_case(method.slice(5));
            return this.assoc(field, args[0]);
        }

        else if ('dissoc' === method.slice(0,6))
        {
            field = DialectORM.snake_case(method.slice(6));
            return this.dissoc(field, args[0]);
        }

        else
        {
            throw new ReferenceError('Undefined access "'+method+'" in ' + this.constructor.name);
        }
    }

    _populate(data)
    {
        if (empty(data)) return this;

        let klass = this.constructor;
        let hydrateFromDB = has(data, klass.pk) && !empty(data[klass.pk]);
        for (let i = 0; i < klass.fields.length; i++)
        {
            let field = klass.fields[i];
            if (has(data, field))
            {
                this.set(field, data[field]);
            }
            else
            {
                hydrateFromDB = false;
                if (!this.has(field))
                    this.set(field, null);
            }
        }
        // populated from DB hydration, clear dirty flags
        if (hydrateFromDB) this.isDirty = Object.create(null);
        return this;
    }

    toObj(deep=false, diff=false, stack=[])
    {
        let klass = this.constructor;
        if (has(stack, klass)) return null;
        let a = {};
        for (let i = 0; i < klass.fields.length; i++)
        {
            let field = klass.fields[i];
            if (diff && !has(this.isDirty, field)) continue;
            a[field] = this.get(field);
        }
        if (deep && !diff)
        {
            stack.push(klass);
            for (let field in klass.relationships)
            {
                if (!has(klass.relationships, field) || !has(this.relations, field) || empty(this.relations[field].data)) continue;

                let entity = this.relations[field].data;
                let data = null;

                if (is_array(entity))
                {
                    data = [];
                    for (let e = 0; e < entity.length; e++)
                    {
                        let d = entity[e].toObj(true, false, stack);
                        if (!empty(d)) data.push(d);
                    }
                }
                else
                {
                    data = entity.toObj(true, false, stack);
                }

                if (!empty(data)) a[field] = data;
            }
            stack.pop();
        }
        return a;
    }

    async save(options={})
    {
        options = merge({
            'force' : false,
            'withRelated' : false
        }, options);

        let klass = this.constructor, res = 0, pk, id, conditions, withRelated,
            field, i, rel, entity, e, eid, eids, cls, jtbl, entities, values, exists;

        if (options['withRelated'] === true) withRelated = Object.keys(klass.relationships);
        else if (options['withRelated'] === false) withRelated = [];
        else withRelated = !is_array(options['withRelated']) ? [options['withRelated']] : options['withRelated'];

        for (i = 0; i < withRelated.length; i++)
        {
            field = String(withRelated[i]);
            if (!has(this.relations, field)) continue;
            rel = this.relations[field];
            entity = rel.data;
            cls = rel.b;
            if (has(['belongsto'], rel.type) && (entity instanceof cls))
            {
                await entity.save();
                this.set(rel.keyb, entity.primaryKey());
            }
        }

        pk = klass.pk;
        if (!empty(this.isDirty))
        {
            await this.beforeSave();

            id = this.get(pk);
            if (!empty(id) && !options['force'])
            {
                // update
                conditions = {};
                conditions[pk] = id;
                this.sql().clear().Update(
                    DialectORM.tbl(klass.table)
                ).Set(
                    this.toObj(false, true)
                ).Where(
                    conditions
                );
            }
            else
            {
                // insert
                this.sql().clear().Insert(
                    DialectORM.tbl(klass.table), klass.fields
                ).Values(
                    klass.fields.map(f => has(this.data, f) ? this.data[f] : null)
                );
            }


            res = await this.db().query(String(this.sql()));
            if (empty(id)) this.set(pk, res['insertId']);
            res = res['affectedRows'];
            this.isDirty = Object.create(null);

            await this.afterSave(res);
        }

        id = this.get(pk);
        for (i = 0; i < withRelated.length; i++)
        {
            field = String(withRelated[i]);
            if (!has(this.relations, field) || has(['belongsto'], this.relations[field].type)) continue;
            rel = this.relations[field];
            cls = rel.b;
            if (!empty(rel.data))
            {
                if (is_array(rel.data))
                {
                    if ('hasmany'===rel.type)
                    {
                        for (e = 0; e < rel.data.length; e++)
                        {
                            entity = rel.data[e];
                            if (entity instanceof cls)
                                entity.set(rel.keyb, id);
                        }
                    }
                    for (e = 0; e < rel.data.length; e++)
                    {
                        entity = rel.data[e];
                        if (entity instanceof cls)
                            await entity.save();
                    }
                }
                else
                {
                    entity = rel.data;
                    if ('hasone'===rel.type)
                    {
                        if (entity instanceof cls)
                            entity.set(rel.keyb, id);
                    }
                    if (entity instanceof cls)
                        await entity.save();
                }

                if ('belongstomany'===rel.type)
                {
                    jtbl = DialectORM.tbl(rel.ab);
                    entities = rel.data;
                    eids = [];
                    for (e = 0; e < entities.length; e++)
                    {
                        entity = entities[e];
                        if (!(entity instanceof cls)) continue;
                        eid = entity.primaryKey();
                        if (empty(eid)) continue;
                        eids.push(eid);
                    }

                    // the most cross-platform way seems to do an extra select to check if relation already exists
                    // https://stackoverflow.com/questions/13041023/insert-on-duplicate-key-update-nothing-using-mysql/13041065
                    conditions = {};
                    conditions[rel.keyb] = {'in':eids};
                    conditions[rel.keya] = id;
                    exists = (empty(eids) ? [] : (await this.db().get(
                        this.sql().clear().Select(
                            rel.keyb
                        ).From(
                            jtbl
                        ).Where(
                            conditions
                        ).sql()
                    ))).map(v => String(v[rel.keyb]));

                    values = [];
                    for (e = 0; e < entities.length; e++)
                    {
                        entity = entities[e];
                        if (!(entity instanceof cls)) continue;
                        eid = entity.primaryKey();
                        if (empty(eid)) continue;
                        if (!has(exists, String(eid)))
                        {
                            exists.push(String(eid));
                            values.push([eid, id]);
                        }
                    }

                    if (!empty(values))
                    {
                        await this.db().query(
                            this.sql().clear().Insert(
                                jtbl, [rel.keyb, rel.keya]
                            ).Values(
                                values
                            ).sql()
                        );
                    }
                }
            }
        }

        return res;
    }

    async del(options={})
    {
        options = merge({
            'withRelated' : false
        }, options);

        let res = 0;

        let klass = this.constructor;
        if (null != this.data)
        {
            let pk = klass.pk;
            let id = this.get(pk);
            if (!empty(id))
            {
                // delete
                let conditions = {};
                conditions[pk] = id;
                res = await klass.delAll({
                    'conditions' : conditions,
                    'withRelated' : options['withRelated']
                });
            }
            this.clear();
        }

        return res;
    }
}

DialectORM.VERSION = '1.0.0';

DialectORM.Exception = DialectORMException;
DialectORM.Relation = DialectORMRelation;
DialectORM.IDb = IDialectORMDb;

// private static
DialectORM.deps = {};
DialectORM.dbh = null;
DialectORM.tblprefix = '';

DialectORM.dependencies = function(deps) {
    DialectORM.deps = merge(DialectORM.deps, deps);
};

DialectORM.dependency = function(dep, default_=null) {
    return has(DialectORM.deps, dep) ? DialectORM.deps[dep] : default_;
};

DialectORM.DBHandler = function(db = null) {
    if (arguments.length)
    {
        if (!(db instanceof IDialectORMDb))
            throw new DialectORM.Exception('DialectORM DB must implement DialectORM.IDb');
        DialectORM.dbh = db;
    }
    return DialectORM.dbh;
};

DialectORM.SQLBuilder = function() {
    if (!Dialect)
    {
        let entry = DialectORM.dependency('Dialect');
        if (!empty(entry))
        {
            if (is_string(entry))
                Dialect = require(entry); // can set module path, nodejs only
            else if ('function' === typeof(entry))
                Dialect = entry; // else eg for browser, set Dialect class directly as dependency
        }
    }
    let db = DialectORM.DBHandler();
    let sql = new Dialect(db.vendor());
    sql.escape(s => db.escape(s), db.escapeWillQuote());
    if ('function' === typeof(db['escapeId']))
    {
        sql.escapeId(s => db.escapeId(s), 'function' === typeof(db['escapeIdWillQuote']) ? db.escapeIdWillQuote() : false);
    }
    return sql;
};

DialectORM.prefix = function(prefix = null) {
    if (arguments.length)
    {
        DialectORM.tblprefix = String(prefix);
    }
    return DialectORM.tblprefix;
};

DialectORM.tbl = function(table) {
    return DialectORM.prefix()+String(table);
};

DialectORM.snake_case = function(s, sep='_') {
    s = lcfirst(s).replace(/[A-Z]/g, (m0) => sep + m0.toLowerCase());
    return sep===s.charAt(0) ? s.slice(1) : s;
};

DialectORM.camelCase = function(s, PascalCase=false, sep='_') {
    s = s.replace(new RegExp(esc_re(sep)+'([a-z])', 'g'), (m0, m1) => m1.toUpperCase());
    return PascalCase ? ucfirst(s) : s;
};

// export it
return DialectORM;
});
