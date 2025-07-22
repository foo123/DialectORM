/**
*   DialectORM,
*   tiny, fast, super-simple but versatile Object-Relational-Mapper with Relationships and Object-NoSql-Mapper for PHP, JavaScript, Python
*
*   @version: 2.1.0
*   https://github.com/foo123/DialectORM
**/
!function(root, name, factory) {
"use strict";
if (('object'===typeof module)&&module.exports) /* CommonJS */
    (module.$deps = module.$deps||{}) && (module.exports = module.$deps[name] = factory.call(root));
else if (('function'===typeof define)&&define.amd&&('function'===typeof require)&&('function'===typeof require.specified)&&require.specified(name) /*&& !require.defined(name)*/) /* AMD */
    define(name,['module'],function(module) {factory.moduleUri = module.uri; return factory.call(root);});
else if (!(name in root)) /* Browser/WebWorker/.. */
    (root[name] = factory.call(root)||1)&&('function'===typeof(define))&&define.amd&&define(function() {return root[name];} );
}(/* current root */          'undefined' !== typeof self ? self : this,
  /* module name */           "DialectORM",
  /* module factory */        function ModuleFactory__DialectORM(undef) {
"use strict";

var Dialect = null

class DialectORMEntity
{
    static snake_case(s, sep = '_')
    {
        s = lcfirst(s).replace(/[A-Z]/g, (m0) => sep + m0.toLowerCase());
        return sep === s.charAt(0) ? s.slice(1) : s;
    }

    static camelCase(s, PascalCase = false, sep = '_')
    {
        s = s.replace(new RegExp(esc_re(sep)+'([a-z])', 'g'), (m0, m1) => m1.toUpperCase());
        return PascalCase ? ucfirst(s) : s;
    }

    static key(k, v, conditions = {}, prefix = '')
    {
        if (is_array(k))
        {
            v = array(v);
            for (let i = 0, n = k.length; i < n; ++i)
                conditions[prefix + k[i]] = v[i];
        }
        else
        {
            conditions[prefix + k] = v;
        }
        return conditions;
    }

    static emptykey(k)
    {
        if (is_array(k))
            return empty(k) || (k.length > k.filter(ki => !empty(ki)).length);
        else
            return empty(k);
    }

    static strkey(k)
    {
        if (is_array(k))
            return k.map(ki => String(ki)).join(':&:');
        else
            return String(k);
    }

    static pluck(entities, field = '')
    {
        if ('' === field)
            return entities.map(entity => entity.primaryKey());
        else
            return entities.map(entity => entity.get_(field));
    }

    static sorter(args = [])
    {
        // Array multi - sorter utility
        // returns a sorter that can (sub-)sort by multiple (nested) fields
        // each ascending or descending independantly
        let klass = this, i, /*args = arguments,*/ l = args.length,
            a, b, avar, bvar, variables, step, lt, gt,
            field, filter_args, sorter_args, desc, dir, sorter;
        // + before a (nested) field indicates ascending sorting (default),
        // example "+a.b.c"
        // - before a (nested) field indicates descending sorting,
        // example "-b.c.d"
        if (l)
        {
            step = 1;
            sorter = [];
            variables = [];
            sorter_args = [];
            filter_args = [];
            for (i = l-1; i >= 0; --i)
            {
                field = args[i];
                // if is array, it contains a filter function as well
                filter_args.unshift('f' + String(i));
                if (is_array(field))
                {
                    sorter_args.unshift(field[1]);
                    field = field[0];
                }
                else
                {
                    sorter_args.unshift(null);
                }
                dir = field.charAt(0);
                if ('-' === dir)
                {
                    desc = true;
                    field = field.slice(1);
                }
                else if ('+' === dir)
                {
                    desc = false;
                    field = field.slice(1);
                }
                else
                {
                    // default ASC
                    desc = false;
                }
                field = field.length ? field.split('.').map(f => !f.length ? '' : (/^\d+$/.test(f) ? ('['+f+']') : ('.get(\''+f+'\')'))).join('')/*'["' + field.split('.').join('"]["') + '"]'*/ : '';
                a = "a"+field; b = "b"+field;
                if (sorter_args[0])
                {
                    a = filter_args[0] + '(' + a + ')';
                    b = filter_args[0] + '(' + b + ')';
                }
                avar = 'a_'+String(i); bvar = 'b_'+String(i);
                variables.unshift(''+avar+'='+a+','+bvar+'='+b+'');
                lt = desc ? (''+step) : ('-'+step); gt = desc ? ('-'+step) : (''+step);
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

    static pk = null;

    static async fetchByPk(id, default_ = null)
    {
        return default_;
    }

    static async fetchAll(options = {}, default_ = [])
    {
        return default_;
    }

    primaryKey(default_ = 0)
    {
        let klass = this.constructor;
        return this.get_(klass.pk, default_);
    }

    get_(field, default_ = null)
    {
        return default_;
    }

    async get(field, default_ = null, options = {})
    {
        return default_;
    }

    set(field, val = null, options = {})
    {
        return this;
    }

    has(field)
    {
        return false;
    }

    clear()
    {
        this.data = null;
        this.isDirty = null;
        return this;
    }

    toObj(diff = false)
    {
        return {};
    }

    async beforeSave()
    {
        //pass
    }

    async afterSave(result=0)
    {
        //pass
    }

    async save(options = {})
    {
        return 0;
    }

    async del(options = {})
    {
        return 0;
    }
}

// interface
class IDialectORMDb
{
    vendor() {NotImplemented();}
    query(sql) {NotImplemented();}
    get(sql) {NotImplemented();}
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

    constructor(type, a, b, kb, ka = null, ab = null)
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

// https://en.wikipedia.org/wiki/Entity%E2%80%93attribute%E2%80%93value_model
class DialectORMEAV
{
    tbl = null;
    fk = null;
    pk = null;
    key = null;
    val = null;
    data = null;
    isDirty = null;
    isDeleted = null;
    entitykey = null;
    _loaded = false;

    constructor(tbl, fk, pk, key, val)
    {
        this.tbl = String(tbl);
        this.fk = String(is_array(fk) ? fk[0] : fk);
        this.pk = String(is_array(pk) ? pk[0] : pk);
        this.key = String(key);
        this.val = String(val);
        this.data = {};
        this.isDirty = {};
        this.isDeleted = {};
        this.entitykey = null;
        this._loaded = false;
    }

    populate(data)
    {
        if (is_array(data) && data.length)
        {
            let is_from_db = true;
            for (let i=0,dl=data.length,entry; i<dl; ++i)
            {
                entry = data[i];
                if (!entry || (null == entry[this.key])) continue;
                let key = String(entry[this.key]);
                this.data[key] = entry;
                if ((null == entry[this.pk]) || DialectORM.emptykey(entry[this.pk]))
                {
                    this.isDirty[key] = true;
                    is_from_db = false;
                }
                if ((null != entry[this.fk]) && !DialectORM.emptykey(entry[this.fk]))
                {
                    if (empty(this.entitykey))
                    {
                        this.entitykey = entry[this.fk];
                    }
                    else if (String(this.entitykey) !== String(entry[this.fk]))
                    {
                        throw new DialectORM.Exception('DialectORMEAV different EntityKey in data from the same entity');
                    }
                }
            }
            if (!this._loaded) this._loaded = is_from_db;
        }
        return this;
    }

    entity(entitykey = null)
    {
        if (entitykey instanceof DialectORM) entitykey = entitykey.primaryKey();
        this.entitykey = is_array(entitykey) ? entitykey[0] : entitykey;
        return this;
    }

    clear()
    {
        this.data = {};
        this.isDirty = {};
        this.isDeleted = {};
        this._loaded = false;
        return this;
    }

    get_(key, default_ = null)
    {
        key = String(key);
        return this.data[key] && (null != this.data[key][this.val]) ? this.data[key][this.val] : default_;
    }

    async get(key, default_ = null)
    {
        let res = false;
        key = String(key);
        if (null == this.data[key])
        {
            if (!this._loaded)
            {
                // lazy load
                this._loaded = true;
                await this.load(); // load all
                //await this.load(empty(this.data) ? null : [key]); // initially load all
                if (null == this.data[key]) this.data[key] = false;
            }
            else
            {
                this.data[key] = false;
            }
        }
        res = this.data[key];
        return false === res || (null == res[this.val]) ? default_ : res[this.val];
    }

    set(key, val)
    {
        key = String(key);
        if (null == val)
        {
            // unset
            if ((null != this.data[key]) && (this.data[key]))
            {
                let entry = this.data[key];
                if ((null != entry[this.pk]) && (!DialectORM.emptykey(entry[this.pk])))
                {
                    this.isDeleted[key] = entry[this.pk];
                }
                delete this.data[key];
                if (null != this.isDirty[key]) delete this.isDirty[key];
            }
        }
        else
        {
            // set
            if (null != this.data[key])
            {
                if (!this.data[key])
                {
                    this.data[key] = {};
                    this.data[key][this.key] = key;
                }
                if (null == this.data[key][this.val])
                {
                    this.data[key][this.val] = val;
                    this.isDirty[key] = true;
                }
                else
                {
                    let prev = this.data[key][this.val];
                    if (prev !== val)
                    {
                        this.data[key][this.val] = val;
                        this.isDirty[key] = true;
                    }
                }
            }
            else
            {
                this.data[key] = {};
                this.data[key][this.key] = key;
                this.data[key][this.val] = val;
                this.isDirty[key] = true;
            }
            if (null != this.isDeleted[key])
            {
                this.data[key][this.pk] = this.isDeleted[key];
                delete this.isDeleted[key];
            }
        }
        return this;
    }

    async load(keys = null)
    {
        if (!DialectORM.emptykey(this.entitykey))
        {
            let conditions = {};
            conditions[this.fk] = this.entitykey;
            if (null != keys) conditions[this.key] = {'in':array(keys)};
            // load efficiently
            this.populate(await DialectORM.DBHandler().get(
                DialectORM.SQLBuilder().clear()
                .Select('*')
                .From(DialectORM.tbl(this.tbl))
                .Where(conditions)
                .sql()
            ));
        }
        return this;
    }

    async update(keys = null)
    {
        let res = 0, pk, fk, key, val, fields, entitykey,
            ids, update, insert, k, d, id, v, upd, conditions, r;
        if (!empty(this.isDirty))
        {
            keys = null == keys ? Object.keys(this.isDirty) : array(keys);
            if (keys && keys.length)
            {
                pk = this.pk;
                fk = this.fk;
                key = this.key;
                val = this.val;
                fields = [pk, fk, key, val];
                entitykey = DialectORM.emptykey(this.entitykey) ? null : this.entitykey;
                ids = [];
                update = {};
                insert = [];
                for (let i=0,kl=keys.length; i<kl; ++i)
                {
                    k = String(keys[i]);
                    if ((null == this.data[k]) || !this.data[k] || empty(this.isDirty[k])) continue;
                    d = this.data[k];
                    id = null != d[pk] ? d[pk] : null;
                    if ((null != id) && !DialectORM.emptykey(id))
                    {
                        v = String(d[val]);
                        if (null == update[v])
                        {
                            update[v] = {'_':{'or':[]}};
                        }
                        upd = {};
                        upd[pk] = id;
                        update[v]['_']['or'].push(upd);
                        ids.push(id);
                        delete this.isDirty[k];
                    }
                    else if (!empty(entitykey))
                    {
                        insert.push(fields.map((f) => f===fk ? entitykey : ((null != d[f]) ? d[f] : null)));
                        delete this.isDirty[k];
                    }
                }
                if (insert.length)
                {
                    // find if already existing
                    conditions = {};
                    conditions[fk] = entitykey;
                    conditions[key] = {'in':insert.map((ins) => ins[2/*key*/])};
                    let existing = DialectORM.DBHandler().get(
                        DialectORM.SQLBuilder().clear()
                        .Select('*')
                        .From(DialectORM.tbl(this.tbl))
                        .Where(conditions)
                        .sql()
                    );
                    if (existing && existing.length)
                    {
                        let mapp = {};
                        for (let i=0,n=insert.length; i<l; ++i) mapp[String(insert[i][key])] = insert[i];
                        for (let i=0,n=existing.length; i<l; ++i)
                        {
                            let entry = existing[i];
                            let k = String(entry[key]);
                            if (String(entry[val]) !== String(mapp[k][3]))
                            {
                                id = entry[pk];
                                v = String(entry[val]);
                                if (null == update[v])
                                {
                                    update[v] = {'_':{'or':[]}};
                                }
                                upd = {};
                                upd[pk] = id;
                                update[v]['_']['or'].push(upd);
                                ids.push(id);
                            }
                            delete mapp[k];
                        }
                        insert = Object.keys(mapp).map(k => mapp[k]);
                    }
                }
                if (Object.keys(update).length)
                {
                    // update efficiently
                    upd = {};
                    upd[val] = {'case':update};
                    conditions = {};
                    conditions[pk] = {'in':ids};
                    r = await DialectORM.DBHandler().query(
                        DialectORM.SQLBuilder().clear()
                        .Update(DialectORM.tbl(this.tbl))
                        .Set(upd)
                        .Where(conditions)
                        .sql()
                    );
                    res += r['affectedRows'];
                }
                if (insert.length)
                {
                    // insert efficiently
                    r = await DialectORM.DBHandler().query(
                        DialectORM.SQLBuilder().clear()
                        .Insert(DialectORM.tbl(this.tbl), fields)
                        .Values(insert)
                        .sql()
                    );
                    res += r['affectedRows'];
                    conditions = {};
                    conditions[fk] = entitykey;
                    conditions[key] = {'in':insert.map((ins) => ins[2/*key*/])};
                    r = await DialectORM.DBHandler().get(
                        DialectORM.SQLBuilder().clear()
                        .Select([pk, key])
                        .From(DialectORM.tbl(this.tbl))
                        .Where(conditions)
                        .sql()
                    );
                    for (let i=0,rl=r.length; i<rl; ++i)
                    {
                        this.data[r[i][key]][pk] = r[i][pk];
                    }
                }
            }
        }
        return res;
    }

    async del(keys = null)
    {
        let res = 0, pk, ids, k, d, id, conditions, r;
        if (!empty(this.data))
        {
            pk = this.pk;
            keys = null == keys ? Object.keys(this.data).concat(Object.keys(this.isDeleted)) : array(keys);
            if (keys && keys.length)
            {
                ids = [];
                for (let i=0,kl=keys.length; i<kl; ++i)
                {
                    k = String(keys[i]);
                    if (null != this.isDeleted[k])
                    {
                        ids.push(this.isDeleted[k]);
                        delete this.isDeleted[k];
                    }
                    else
                    {
                        if ((null == this.data[k]) || !this.data[k]) continue;
                        d = this.data[k];
                        id = null != d[pk] ? d[pk] : null;
                        if ((null != id) && !DialectORM.emptykey(id)) ids.push(id);
                        delete this.data[k];
                        if (null != this.isDirty[k]) delete this.isDirty[k];
                    }
                }
                if (ids.length)
                {
                    // delete efficiently
                    conditions = {};
                    conditions[pk] = {'in':ids};
                    r = await DialectORM.DBHandler().query(
                        DialectORM.SQLBuilder()
                            .clear()
                            .Delete()
                            .From(DialectORM.tbl(this.tbl))
                            .Where(conditions)
                            .sql()
                    );
                    res = r['affectedRows'];
                }
            }
        }
        return res;
    }

    async save()
    {
        let res = 0;
        res += await this.del(Object.keys(this.isDeleted));
        res += await this.update(Object.keys(this.isDirty));
        return res;
    }
}

class DialectORM extends DialectORMEntity
{
    static table = null;
    static fields = [];
    static extra_fields = null;
    static relationships = {};

    static conditions(conditions, sql)
    {
        let klass = this,
            table = klass.table,
            pk = klass.pk,
            fields = klass.fields.concat(Object.keys(klass.relationships)),
            extra_fields = klass.extra_fields,
            j = 0, jc = 0, jj = {}
        ;
        function joinConditions(conditions)
        {
            let conditions2 = {};
            for (let f in conditions)
            {
                if (!has(conditions, f)) continue;
                let cond = conditions[f];
                if (has(cond, 'or'))
                {
                    let cases = [];
                    for (let i=0,n=cond['or'].length; i<n; ++i)
                    {
                        cases.push(joinConditions(cond['or'][i]));
                    }
                    conditions2[f] = {'or':cases};
                    continue;
                }
                if (has(cond, 'and'))
                {
                    let cases = [];
                    for (let i=0,n=cond['and'].length; i<n; ++i)
                    {
                        cases.push(joinConditions(cond['and'][i]));
                    }
                    conditions2[f] = {'and':cases};
                    continue;
                }
                let ref = Dialect.Ref.parse(f, sql);
                let field = ref._col;
                if (has(fields, field))
                {
                    conditions2[f] = cond;
                    continue;
                }
                let eav_key = extra_fields[3];
                let eav_value = extra_fields[4];
                let join_alias = '';
                if (!has(jj, field))
                {
                    jj[field] = ++j;
                    let main_table = DialectORM.tbl(table);
                    let main_id = is_array(pk) ? pk[0] : pk;
                    let join_table = DialectORM.tbl(extra_fields[0]);
                    let join_id = is_array(extra_fields[1]) ? extra_fields[1][0] : extra_fields[1];
                    join_alias = join_table+String(jj[field]);
                    sql.Join(
                        join_table+' AS '+join_alias,
                        main_table+'.'+main_id+'='+join_alias+'.'+join_id,
                        "inner"
                    );
                }
                else
                {
                    join_alias = DialectORM.tbl(extra_fields[0])+String(jj[field]);
                }
                let cases1 = {};
                cases1[join_alias+'.'+eav_key] = field;
                let cases2 = {};
                cases2[join_alias+'.'+eav_value] = cond;
                conditions2[join_alias+'_'+String(++jc)] = {'and':[cases1,cases2]};
            }
            return conditions2;
        };
        return empty(extra_fields) ? conditions : joinConditions(conditions);
    }

    static async fetchByPk(id, default_ = null)
    {
        let klass = this, entity;
        entity = await DialectORM.DBHandler().get(
            DialectORM.SQLBuilder().clear().Select(
                    klass.fields
                ).From(
                    DialectORM.tbl(klass.table)
                ).Where(
                    DialectORM.key(klass.pk, id, {})
                ).sql()
        );
        return !empty(entity) ? new klass(is_array(entity) ? entity[0] : entity) : default_;
    }

    static async count(options = {})
    {
        let klass = this, sql, res;
        options = merge({'conditions' : {}}, options);
        sql = DialectORM.SQLBuilder().clear().Select(
            'COUNT(*) AS cnt'
            ).From(
                DialectORM.tbl(klass.table)
            );

        res = await DialectORM.DBHandler().get(sql.Where(klass.conditions(options['conditions'], sql)).sql());
        return res[0]['cnt'];
    }

    static async fetchAll(options = {}, default_ = [])
    {
        let klass = this, pk = klass.pk, table, field, entities,
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

        table = DialectORM.tbl(klass.table);
        sql = DialectORM.SQLBuilder().clear().Select(
                klass.fields.map((field) => table+'.'+field+' AS '+field)
            ).From(
                table
            )
        ;
        sql.Where(klass.conditions(options['conditions'], sql));
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

        if (!empty(klass.extra_fields))
        {
            // eager optimised (no N+1 issue) loading of EAV extra fields
            ids = entities.map((entry) => entry[is_array(pk) ? pk[0] : pk]);
            let fk = is_array(klass.extra_fields[1]) ? klass.extra_fields[1][0] : klass.extra_fields[1];
            conditions = {};
            conditions[fk] = {'in':ids};
            let eav = await DialectORM.DBHandler().get(sql.clear().Select('*').From(DialectORM.tbl(klass.extra_fields[0])).Where(conditions).sql());
            for (i = 0; i < entities.length; ++i)
                entities[i] = new klass(entities[i], eav.filter((entry) => String(entry[fk]) === String(ids[i])));
        }
        else
        {
            for (i = 0; i < entities.length; ++i)
                entities[i] = new klass(entities[i]);
        }

        if (!empty(options['withRelated']))
        {
            // eager optimised (no N+1 issue) loading of selected relations
            ids = klass.pluck(entities);
            for (f = 0; f < options['withRelated'].length; ++f)
            {
                field = String(options['withRelated'][f]);
                if (!has(klass.relationships, field)) continue;
                rel = klass.relationships[field];
                type = rel[0].toLowerCase();
                cls = rel[1];
                conditions = {};
                if ('hasone' === type)
                {
                    fk = rel[2];
                    if (is_array(fk))
                    {
                        conditions[DialectORM.strkey(fk)] = {'or':ids.map(id => DialectORM.key(fk, id, {}))};
                    }
                    else
                    {
                        conditions[fk] = {'in':ids};
                    }
                    if (has(options['related'], field) && has(options['related'][field], 'conditions'))
                    {
                        conditions = merge({}, options['related'][field]['conditions'], conditions);
                    }
                    rentities = await cls.fetchAll({
                        'conditions' : conditions
                    });
                    mapp = {};
                    for (re = 0; re < rentities.length; ++re)
                    {
                        mapp[DialectORM.strkey(rentities[re].get_(fk))] = rentities[re];
                    }
                    for (e = 0; e < entities.length; ++e)
                    {
                        kv = DialectORM.strkey(entities[e].primaryKey());
                        entities[e].set(field, has(mapp, kv) ? mapp[kv] : null);
                    }
                }
                else if ('hasmany' === type)
                {
                    fk = rel[2];
                    if (has(options['related'], field) && has(options['related'][field], 'limit'))
                    {
                        sql = DialectORM.SQLBuilder();
                        selects = [];
                        for (i = 0; i < ids.length; ++i)
                        {
                            conditions = DialectORM.key(fk, ids[i], {});
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

                        rentities = await DialectORM.DBHandler().get(sql.clear().Union(selects, false).sql());
                        for (i = 0; i < rentities.length; ++i)
                            rentities[i] = new cls(rentities[i]);
                    }
                    else
                    {
                        conditions = {};
                        if (is_array(fk))
                        {
                            conditions[DialectORM.strkey(fk)] = {'or':ids.map(id => DialectORM.key(fk, id, {}))};
                        }
                        else
                        {
                            conditions[fk] = {'in':ids};
                        }
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
                    for (re = 0; re < rentities.length; ++re)
                    {
                        fkv = DialectORM.strkey(rentities[re].get_(fk));
                        if (!has(mapp, fkv)) mapp[fkv] = [rentities[re]];
                        else mapp[fkv].push(rentities[re]);
                    }
                    for (e = 0; e < entities.length; ++e)
                    {
                        kv = DialectORM.strkey(entities[e].primaryKey());
                        entities[e].set(field, has(mapp, kv) ? mapp[kv] : []);
                    }
                }
                else if ('belongsto' === type)
                {
                    fk = rel[2];
                    rpk = cls.pk;
                    fids = klass.pluck(entities, fk);
                    if (is_array(rpk))
                    {
                        conditions[DialectORM.strkey(rpk)] = {'or':fids.map(id => DialectORM.key(rpk, id, {}))};
                    }
                    else
                    {
                        conditions[rpk] = {'in':fids};
                    }
                    if (has(options['related'], field) && has(options['related'][field], 'conditions'))
                    {
                        conditions = merge({}, options['related'][field]['conditions'], conditions);
                    }
                    rentities = await cls.fetchAll({
                        'conditions' : conditions
                    });
                    mapp = {};
                    for (re = 0; re < rentities.length; ++re)
                    {
                        mapp[DialectORM.strkey(rentities[re].primaryKey())] = rentities[re];
                    }
                    for (e = 0; e < entities.length; ++e)
                    {
                        fkv = DialectORM.strkey(entities[e].get_(fk));
                        entities[e].set(field, has(mapp, fkv) ? mapp[fkv] : null, {'recurse':true,'merge':true});
                    }
                }
                else if ('belongstomany' === type)
                {
                    ab = DialectORM.tbl(rel[4]);
                    fk = rel[2];
                    pk2 = rel[3];
                    rpk = cls.pk;
                    if (is_array(pk2))
                    {
                        conditions[DialectORM.strkey(pk2)] = {'or':ids.map(id => DialectORM.key(pk2, id, {}))};
                    }
                    else
                    {
                        conditions[pk2] = {'in':ids};
                    }
                    reljoin = await DialectORM.DBHandler().get(
                        DialectORM.SQLBuilder().clear().Select(
                            '*'
                        ).From(
                            ab
                        ).Where(
                            conditions
                        ).sql()
                    );
                    fids = reljoin.map(is_array(fk) ? (d => fk.map(k => d[k])) : (d => d[fk]));
                    if (!empty(fids) && has(options['related'], field) && has(options['related'][field], 'limit'))
                    {
                        sql = DialectORM.SQLBuilder();
                        selects = [];
                        for (i = 0; i < fids.length; ++i)
                        {
                            conditions = DialectORM.key(rpk, fids[i], {});
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

                        rentities = await DialectORM.DBHandler().get(sql.clear().Union(selects, false).sql());
                        for (i = 0; i < rentities.length; ++i)
                            rentities[i] = new cls(rentities[i]);
                    }
                    else
                    {
                        conditions = {};
                        if (is_array(rpk))
                        {
                            conditions[DialectORM.strkey(rpk)] = {'or':fids.map(id => DialectORM.key(rpk, id, {}))};
                        }
                        else
                        {
                            conditions[rpk] = {'in':fids};
                        }
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
                    for (re = 0; re < rentities.length; ++re)
                    {
                        mapp[DialectORM.strkey(rentities[re].primaryKey())] = rentities[re];
                    }
                    relmapp = {};
                    for (d = 0; d < reljoin.length; ++d)
                    {
                        k1 = DialectORM.strkey(is_array(pk2) ? pk2.map(k => reljoin[d][k]) : reljoin[d][pk2]);
                        k2 = DialectORM.strkey(is_array(fk) ? fk.map(k => reljoin[d][k]) : reljoin[d][fk]);
                        if (has(mapp, k2))
                        {
                            if (!has(relmapp, k1)) relmapp[k1] = [mapp[k2]];
                            else relmapp[k1].push(mapp[k2]);
                        }
                    }
                    for (e = 0; e < entities.length; ++e)
                    {
                        k1 = DialectORM.strkey(entities[e].primaryKey());
                        entities[e].set(field, has(relmapp, k1) ? relmapp[k1] : []);
                    }
                }
            }
        }
        return retSingle ? entities[0] : entities;
    }

    static async delAll(options = {})
    {
        let klass = this, pk, ids, field, sql, res, rel, type, cls, conditions, fk;
        options = merge({
            'conditions' : {},
            'limit' : null,
            'withRelated' : false
        }, options);

        ids = null;
        if (!empty(options['withRelated']))
        {
            ids = klass.pluck(await klass.fetchAll({'conditions':options['conditions'], 'limit':options['limit']}));
            if (!empty(klass.extra_fields))
            {
                conditions = {};
                conditions[is_array(klass.extra_fields[1]) ? klass.extra_fields[1][0] : klass.extra_fields[1]] = {'in':ids};
                await DialectORM.DBHandler().query(
                    DialectORM.SQLBuilder()
                        .clear()
                        .Delete()
                        .From(DialectORM.tbl(klass.extra_fields[0]))
                        .Where(conditions)
                        .sql()
                );
            }
            for (field in klass.relationships)
            {
                if (!has(klass.relationships, field)) continue;
                rel = klass.relationships[field];
                type = rel[0].toLowerCase();
                cls = rel[1];
                conditions = {};
                if ('belongsto' === type)
                {
                    // bypass
                }
                else if ('belongstomany' === type)
                {
                    // delete relation from junction table
                    fk = rel[3];
                    if (is_array(fk))
                    {
                        conditions[DialectORM.strkey(fk)] = {'or':ids.map(id => DialectORM.key(fk, id, {}))};
                    }
                    else
                    {
                        conditions[fk] = {'in':ids};
                    }
                    await DialectORM.DBHandler().query(
                        DialectORM.SQLBuilder().clear().Delete(
                            ).From(
                                DialectORM.tbl(rel[4])
                            ).Where(
                                conditions
                            ).sql()
                    );
                }
                else
                {
                    fk = rel[2];
                    if (is_array(fk))
                    {
                        conditions[DialectORM.strkey(fk)] = {'or':ids.map(id => DialectORM.key(fk, id, {}))};
                    }
                    else
                    {
                        conditions[fk] = {'in':ids};
                    }
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
            if (is_array(pk))
            {
                conditions[DialectORM.strkey(pk)] = {'or':ids.map(id => DialectORM.key(pk, id, {}))};
            }
            else
            {
                conditions[pk] = {'in':ids};
            }
            sql = DialectORM.SQLBuilder().clear().Delete(
                ).From(
                    DialectORM.tbl(klass.table)
                ).Where(
                    conditions
                );
        }
        else
        {
            sql = DialectORM.SQLBuilder().clear().Delete(
                ).From(
                    DialectORM.tbl(klass.table)
                );
            sql.Where(klass.conditions(options['conditions'], sql));
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

    _db = null;
    _sql = null;

    data = null;
    isDirty = null;
    relations = null;
    eav = null;

    proxy = null;

    constructor(data = {}, extra = null)
    {
        super();
        this._db = null;
        this._sql = null;
        this.relations = {};
        this.eav = null;
        this.data = null;
        this.isDirty = null;

        if (is_obj(data) && !empty(data))
        {
            this._populate(data);
        }
        let klass = this.constructor;
        if (!empty(klass.extra_fields))
        {
            this.eav = new DialectORMEAV(klass.extra_fields[0], klass.extra_fields[1], klass.extra_fields[2], klass.extra_fields[3], klass.extra_fields[4]);
            if (is_array(extra) && extra.length)
            {
                this.eav.populate(extra);
            }
        }

        // return the proxy
        this.proxy = new Proxy(this, magicMethodsProxy);
        return this.proxy;
    }

    db()
    {
        if (!this._db) this._db = DialectORM.DBHandler();
        return this._db;
    }

    sql()
    {
        if (!this._sql) this._sql = DialectORM.SQLBuilder();
        return this._sql;
    }

    get_(field, default_ = null)
    {
        if (is_array(field))
        {
            return field.map((f, i) => this.get_(f, is_array(default_) ? default_[i] : default_));
        }

        field = String(field);

        let klass = this.constructor;
        if (this.eav && !has(klass.fields, field))
        {
            return this.eav.get_(field, default_);
        }
        if (!is_obj(this.data) || !has(this.data, field))
        {
            if (has(klass.fields, field)) return default_;
            throw new DialectORM.Exception('Undefined Field: "' + field + '" in ' + klass.name + ' via get()');
        }

        return this.data[field];
    }

    async get(field, default_ = null, options = {})
    {
        if (is_array(field))
        {
            return await Promise.all(field.map(async (f, i) => await this.get(f, is_array(default_) ? default_[i] : default_, options)));
        }

        field = String(field);

        let klass = this.constructor;
        if (has(klass.relationships, field))
        {
            return await this._getRelated(field, default_, options);
        }
        if (this.eav && !has(klass.fields, field))
        {
            return await this.eav.get(field, default_);
        }
        if (!is_obj(this.data) || !has(this.data, field))
        {
            if (has(klass.fields, field)) return default_;
            throw new DialectORM.Exception('Undefined Field: "' + field + '" in ' + klass.name + ' via get()');
        }

        return this.data[field];
    }

    _getRelated(field, default_ = null, options = {})
    {
        let klass = this.constructor, rel = null,
            type, a, b, kb, ka, ab, cls, mirrorRel, entity, fk, i,
            tbl, jtbl, pk, jon, fields;
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
                    if ('hasone' === rel.type || 'hasmany' === rel.type)
                    {
                        cls = rel.b;
                        fk = rel.keyb;
                        if ('hasone' === rel.type)
                        {
                            cls.fetchAll({
                                'conditions' : DialectORM.key(fk, this.primaryKey(), {}),
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
                            cls.fetchAll({
                                'conditions' : DialectORM.key(fk, this.primaryKey(), merge({}, options['conditions'])),
                                'order' : options['order'],
                                'limit' : options['limit']
                            }).then(res => {
                                rel.data = res;
                                if (!empty(rel.data))
                                {
                                    mirrorRel = this._getMirrorRel(rel);
                                    if (mirrorRel)
                                    {
                                        for (i = 0; i < rel.data.length; ++i)
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
                    else if ('belongsto' === rel.type)
                    {
                        cls = rel.b;
                        cls.fetchByPk(this.get_(rel.keyb), null).then(res => {
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
                    else if ('belongstomany' === rel.type)
                    {
                        cls = rel.b;
                        tbl = DialectORM.tbl(cls.table);
                        jtbl = DialectORM.tbl(rel.ab);
                        jon = {};
                        pk = array(cls.pk);
                        fk = array(rel.keyb);
                        for (i = 0; i < pk.length; ++i) jon[tbl + '.' + pk[i]] = jtbl + '.' + fk[i];
                        fields = cls.fields;
                        for (i = 0; i < fields.length; ++i) fields[i] = tbl + '.' + fields[i] + ' AS ' + fields[i];
                        this.sql().clear().Select(
                            fields
                        ).From(
                            tbl
                        ).Join(
                            jtbl, jon, 'inner'
                        ).Where(
                            DialectORM.key(rel.keya, this.primaryKey(), merge({}, options['conditions']), jtbl + '.')
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

    set(field, val = null, options = {})
    {
        if (is_array(field))
        {
            for(let i = 0, n = field.length; i < n; ++i)
                this.set(field[i], is_array(val) ? val[i] : val, options);
            return this.proxy;
        }

        field = String(field);

        let klass = this.constructor, tval, fieldProp, typecast, validate, valid;
        options = merge({
            'raw' : false,
            'recurse' : true,
            'merge' : false
        }, options);

        if (has(klass.relationships, field))
            return this._setRelated(field, val, options);

        if (!has(klass.fields, field))
        {
            if (this.eav)
            {
                tval = val;
                if (!options['raw'])
                {
                    fieldProp = DialectORM.camelCase(field, true);

                    typecast = 'type' + fieldProp;
                    if ('function' === typeof(this[typecast]))
                    {
                        tval = this[typecast](val);
                    }

                    validate = 'validate' + fieldProp;
                    if ('function' === typeof(this[validate]))
                    {
                        valid = this[validate](tval);
                        if (!valid) throw new DialectORM.Exception('Value: "' + String(val) + '" is not valid for Field: "' + field + '" in ' + klass.name);
                    }
                }
                this.eav.set(field, tval);
                return this.proxy;
            }
            else
            {
                throw new DialectORM.Exception('Undefined Field: "' + field + '" in ' + klass.name + ' via set()');
            }
        }

        tval = val;
        if (!options['raw'])
        {
            fieldProp = DialectORM.camelCase(field, true);

            typecast = 'type' + fieldProp;
            if ('function' === typeof(this[typecast]))
            {
                tval = this[typecast](val);
            }

            validate = 'validate' + fieldProp;
            if ('function' === typeof(this[validate]))
            {
                valid = this[validate](tval);
                if (!valid) throw new DialectORM.Exception('Value: "' + String(val) + '" is not valid for Field: "' + field + '" in ' + klass.name);
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
        return this.proxy;
    }

    _setRelated(field, data, options = {})
    {
        let klass = this.constructor, rel = null,
            type, a, b, kb, ka, ab, pks, i, dpk, sk, mirrorRel, pk, entity;
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
                pks = klass.pluck(rel.data).map(k => DialectORM.strkey(k));
                for (i = 0; i < data.length; ++i)
                {
                    dpk = data[i].primaryKey();
                    // add entities that do not exist already
                    sk = DialectORM.strkey(dpk);
                    if (DialectORM.emptykey(dpk) || !has(pks, sk))
                    {
                        rel.data.push(data[i]);
                        if (!DialectORM.emptykey(dpk)) pks.push(sk);
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
                    if ('belongsto' === mirrorRel.type)
                    {
                        pk = this.primaryKey();
                        if (is_array(rel.data))
                        {
                            for (i = 0; i < rel.data.length; ++i)
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
                    else if ('hasone' === mirrorRel.type)
                    {
                        entity = rel.data;
                        entity.set(mirrorRel.field, this.proxy, {'recurse':false});
                    }
                    else if ('hasmany' === mirrorRel.type)
                    {
                        entity = rel.data;
                        entity.set(mirrorRel.field, [this.proxy], {'recurse':false,'merge':true});
                    }
                }
            }
        }

        return this.proxy;
    }

    _getMirrorRel(rel)
    {
        let thisclass, cls, f, r;
        if ('hasone' === rel.type || 'hasmany' === rel.type)
        {
            thisclass = this.constructor;
            cls = rel.b;
            for (f in cls.relationships)
            {
                if (!has(cls.relationships, f)) continue;
                r = cls.relationships[f];
                if ('belongsto' === r[0].toLowerCase() && thisclass === r[1] && eq(rel.keyb, r[2]))
                    return {'type':'belongsto', 'field':f};
            }
        }
        else if ('belongsto' === rel.type)
        {
            thisclass = this.constructor;
            cls = rel.b;
            for (f in cls.relationships)
            {
                if (!has(cls.relationships, f)) continue;
                r = cls.relationships[f];
                if (('hasone' === r[0].toLowerCase() || 'hasmany' === r[0].toLowerCase()) && thisclass === r[1] && eq(rel.keyb, r[2]))
                    return {'type':r[0].toLowerCase(), 'field':f};
            }
        }

        return null;
    }

    has(field)
    {
        field = String(field);
        let klass = this.constructor;
        return !has(klass.relationships, field) && (((null != this.data) && has(this.data, field)) || (this.eav && has(this.eav.data, field)));
    }

    async assoc(field, entity)
    {
        let klass = this.constructor, id, rel, type, cls, jtbl, values, i, ent, eid, eids, conditions, sk, exists;
        field = String(field);
        if (!has(klass.relationships, field))
            throw new DialectORM.Exception('Undefined Field: "'+field+'" in ' + klass.name + ' via assoc()');
        id = this.primaryKey();
        if (!DialectORM.emptykey(id))
        {
            rel = klass.relationships[field];
            type = rel[0].toLowerCase();
            cls = rel[1];
            if ('belongstomany' === type)
            {
                jtbl = DialectORM.tbl(rel[4]);
                eids = [];
                for (i = 0; i < entity.length; ++i)
                {
                    ent = entity[i];
                    if (!(ent instanceof cls)) continue;
                    eid = ent.primaryKey();
                    if (DialectORM.emptykey(eid)) continue;
                    eids.push(eid);
                }

                conditions = DialectORM.key(rel[3], id, {});
                if (is_array(rel[2]))
                {
                    conditions[DialectORM.strkey(rel[2])] = {'or':eids.map(id => DialectORM.key(rel[2], id, {}))};
                }
                else
                {
                    conditions[rel[2]] = {'in':eids};
                }
                exists = (empty(eids) ? [] : (await this.db().get(
                    this.sql().clear().Select(
                        rel[2]
                    ).From(
                        jtbl
                    ).Where(
                        conditions
                    ).sql()
                ))).map(v => DialectORM.strkey(array(rel[2]).map(k => v[k])));

                values = [];
                for (i = 0; i < entity.length; ++i)
                {
                    ent = entity[i];
                    if (!(ent instanceof cls)) continue;
                    eid = ent.primaryKey();
                    if (DialectORM.emptykey(eid)) continue;
                    if (!has(exists, sk = DialectORM.strkey(eid)))
                    {
                        exists.push(sk);
                        values.push(array(eid).concat(array(id)));
                    }
                }

                if (!empty(values))
                {
                    await this.db().query(
                        this.sql().clear().Insert(
                            jtbl, array(rel[2]).concat(array(rel[3]))
                        ).Values(
                            values
                        ).sql()
                    );
                }
                this.sql().clear();
            }
            else if ('belongsto' === type)
            {
                if ((entity instanceof cls) && !DialectORM.emptykey(entity.primaryKey()))
                    await this.set(rel[2], entity.primaryKey()).save();
            }
            else if ('hasone' === type)
            {
                if (entity instanceof cls)
                    await entity.set(rel[2], id).save();
            }
            else if ('hasmany' === type)
            {
                for (i = 0; i < entity.length; ++i)
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
        if (!DialectORM.emptykey(id))
        {
            rel = klass.relationships[field];
            type = rel[0].toLowerCase();
            cls = rel[1];
            if ('belongstomany' === type)
            {
                jtbl = DialectORM.tbl(rel[4]);
                values = [];
                for (i = 0; i < entity.length; ++i)
                {
                    ent = entity[i];
                    if (!(ent instanceof cls)) continue;
                    eid = ent.primaryKey();
                    if (DialectORM.emptykey(eid)) continue;
                    values.push(eid);
                }
                if (!empty(values))
                {
                    conditions = DialectORM.key(rel[3], id, {});
                    if (is_array(rel[2]))
                    {
                        conditions[DialectORM.strkey(rel[2])] = {'or':values.map(id => DialectORM.key(rel[2], id, {}))};
                    }
                    else
                    {
                        conditions[rel[2]] = {'in':values};
                    }
                    await this.db().query(
                        this.sql().clear().Delete(
                        ).From(
                            jtbl
                        ).Where(
                            conditions
                        ).sql()
                    );
                    this.sql().clear();
                }
            }
            else if ('belongsto' === type)
            {
                //pass
            }
            else if ('hasone' === type)
            {
                //pass
            }
            else if ('hasmany' === type)
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
        if (this.eav) this.eav.clear();
        return this.proxy;
    }

    // magic method calls simulated
    __call(method, args, proxy)
    {
        let prefix = method.slice(0, 3), field;
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

        else if ('assoc' === method.slice(0, 5))
        {
            field = DialectORM.snake_case(method.slice(5));
            return this.assoc(field, args[0]);
        }

        else if ('dissoc' === method.slice(0, 6))
        {
            field = DialectORM.snake_case(method.slice(6));
            return this.dissoc(field, args[0]);
        }

        else
        {
            throw new ReferenceError('Undefined access "' + method + '" in ' + this.constructor.name);
        }
    }

    _populate(data)
    {
        if (empty(data)) return this.proxy;

        let klass = this.constructor, hydrateFromDB, i, n;
        if (is_array(klass.pk))
        {
            hydrateFromDB = true
            for (i = 0, n = klass.pk.length; i < n; ++i)
                hydrateFromDB = hydrateFromDB && has(data, klass.pk[i]) && !empty(data[klass.pk[i]]);
        }
        else
        {
            hydrateFromDB = has(data, klass.pk) && !empty(data[klass.pk]);
        }
        for (i = 0; i < klass.fields.length; ++i)
        {
            let field = klass.fields[i];
            if (has(data, field))
            {
                this.set(field, data[field]);
            }
            else
            {
                hydrateFromDB = false;
                if (!this.data || !has(this.data, field))
                    this.set(field, null);
            }
        }
        // populated from DB hydration, clear dirty flags
        if (hydrateFromDB) this.isDirty = Object.create(null);
        return this.proxy;
    }

    toObj(deep = false, diff = false, stack = [])
    {
        let klass = this.constructor;
        if (has(stack, klass)) return null;
        let a = {};
        for (let i = 0; i < klass.fields.length; ++i)
        {
            let field = klass.fields[i];
            if (diff && !has(this.isDirty, field)) continue;
            a[field] = this.get_(field);
        }
        if (deep && !diff)
        {
            if (this.eav)
            {
                let val_key = klass.extra_fields[4];
                for (let field in this.eav.data)
                {
                    if (!has(this.eav.data, field) || !this.eav.data[field]) continue;
                    //if (diff && !has(this.eav.isDirty, field)) continue;
                    a[field] = null != this.eav.data[field][val_key] ? this.eav.data[field][val_key] : null;
                }
            }
            stack.push(klass);
            for (let field in klass.relationships)
            {
                if (!has(klass.relationships, field) || !has(this.relations, field) || empty(this.relations[field].data)) continue;

                let entity = this.relations[field].data;
                let data = null;

                if (is_array(entity))
                {
                    data = [];
                    for (let e = 0; e < entity.length; ++e)
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

    async save(options = {})
    {
        options = merge({
            'force' : false,
            'withRelated' : false
        }, options);

        let klass = this.constructor, res = 0, pk, id, conditions, withRelated,
            field, i, rel, entity, e, eid, eids, cls, sk, jtbl, entities, values, exists;

        if (options['withRelated'] === true) withRelated = Object.keys(klass.relationships);
        else if (options['withRelated'] === false) withRelated = [];
        else withRelated = array(options['withRelated']);

        for (i = 0; i < withRelated.length; ++i)
        {
            field = String(withRelated[i]);
            if (!has(this.relations, field)) continue;
            rel = this.relations[field];
            entity = rel.data;
            cls = rel.b;
            if (has(['belongsto'], rel.type) && (entity instanceof cls))
            {
                await entity.save();//{'withRelated' : [f for f in cls.relationships if cls.relationships[f][1] != klass]}
                this.set(rel.keyb, entity.primaryKey());
            }
        }

        pk = klass.pk;
        if (!empty(this.isDirty))
        {
            await this.beforeSave();

            id = this.primaryKey();
            if (!DialectORM.emptykey(id) && !options['force'])
            {
                // update
                this.sql().clear().Update(
                    DialectORM.tbl(klass.table)
                ).Set(
                    this.toObj(false, true)
                ).Where(
                    DialectORM.key(pk, id, {})
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
            if (DialectORM.emptykey(id)) this.set(pk, is_array(pk) ? [res['insertId']] : res['insertId']);
            res = res['affectedRows'];
            this.isDirty = Object.create(null);

            await this.afterSave(res);
        }

        id = this.primaryKey();
        if (!DialectORM.emptykey(id))
        {
            for (i = 0; i < withRelated.length; ++i)
            {
                field = String(withRelated[i]);
                if (!has(this.relations, field) || has(['belongsto'], this.relations[field].type)) continue;
                rel = this.relations[field];
                cls = rel.b;
                if (!empty(rel.data))
                {
                    if (is_array(rel.data))
                    {
                        if ('hasmany' === rel.type)
                        {
                            for (e = 0; e < rel.data.length; ++e)
                            {
                                entity = rel.data[e];
                                if (entity instanceof cls)
                                    entity.set(rel.keyb, id);
                            }
                        }
                        for (e = 0; e < rel.data.length; ++e)
                        {
                            entity = rel.data[e];
                            if (entity instanceof cls)
                                await entity.save();
                        }
                    }
                    else
                    {
                        entity = rel.data;
                        if ('hasone' === rel.type)
                        {
                            if (entity instanceof cls)
                                entity.set(rel.keyb, id);
                        }
                        if (entity instanceof cls)
                            await entity.save();
                    }

                    if ('belongstomany' === rel.type)
                    {
                        jtbl = DialectORM.tbl(rel.ab);
                        entities = rel.data;
                        eids = [];
                        for (e = 0; e < entities.length; ++e)
                        {
                            entity = entities[e];
                            if (!(entity instanceof cls)) continue;
                            eid = entity.primaryKey();
                            if (DialectORM.emptykey(eid)) continue;
                            eids.push(eid);
                        }

                        // the most cross-platform way seems to do an extra select to check if relation already exists
                        // https://stackoverflow.com/questions/13041023/insert-on-duplicate-key-update-nothing-using-mysql/13041065
                        conditions = DialectORM.key(rel.keya, id, {});
                        if (is_array(rel.keyb))
                        {
                            conditions[DialectORM.strkey(rel.keyb)] = {'or':eids.map(id => DialectORM.key(rel.keyb, id, {}))};
                        }
                        else
                        {
                            conditions[rel.keyb] = {'in':eids};
                        }
                        exists = (empty(eids) ? [] : (await this.db().get(
                            this.sql().clear().Select(
                                rel.keyb
                            ).From(
                                jtbl
                            ).Where(
                                conditions
                            ).sql()
                        ))).map(v => DialectORM.strkey(array(rel.keyb).map(k => v[k])));

                        values = [];
                        for (e = 0; e < entities.length; ++e)
                        {
                            entity = entities[e];
                            if (!(entity instanceof cls)) continue;
                            eid = entity.primaryKey();
                            if (DialectORM.emptykey(eid)) continue;
                            if (!has(exists, sk = DialectORM.strkey(eid)))
                            {
                                exists.push(sk);
                                values.push(array(eid).concat(array(id)));
                            }
                        }

                        if (!empty(values))
                        {
                            await this.db().query(
                                this.sql().clear().Insert(
                                    jtbl, array(rel.keyb).concat(array(rel.keya))
                                ).Values(
                                    values
                                ).sql()
                            );
                        }
                    }
                }
            }
        }

        this.sql().clear();
        if (this.eav) await this.eav.entity(this).save();
        return res;
    }

    async del(options = {})
    {
        options = merge({
            'withRelated' : false
        }, options);

        let res = 0, klass = this.constructor;

        if (null != this.data)
        {
            let pk = klass.pk, id = this.primaryKey();
            if (!DialectORM.emptykey(id))
            {
                // delete
                /*if (this.eav)
                {
                    await this.eav.entity(this).del();
                }*/
                res = await klass.delAll({
                    'conditions' : DialectORM.key(pk, id, {}),
                    'withRelated' : options['withRelated']
                });
            }
            this.clear();
        }

        return res;
    }
}

DialectORM.VERSION = '2.1.0';

DialectORM.Entity = DialectORMEntity;
DialectORM.Exception = DialectORMException;
DialectORM.Relation = DialectORMRelation;
DialectORM.EAV = DialectORMEAV;
DialectORM.IDb = IDialectORMDb;

// private static
DialectORM.deps = {};
DialectORM.dbh = null;
DialectORM.tblprefix = '';

DialectORM.dependencies = function(deps) {
    DialectORM.deps = merge(DialectORM.deps, deps);
};

DialectORM.dependency = function(dep, default_ = null) {
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
            else if ('function' === typeof entry)
                Dialect = entry; // else eg for browser, set Dialect class directly as dependency
        }
    }
    let db = DialectORM.DBHandler();
    let sql = new Dialect(db.vendor());
    if ('function' === typeof db['escape'])
    {
        sql.escape(s => db.escape(s), 'function' === typeof(db['escapeWillQuote']) ? db.escapeWillQuote() : false);
    }
    if ('function' === typeof db['escapeId'])
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
    return DialectORM.prefix() + String(table);
};

DialectORM.eq = eq;

class IDialectORMNoSql
{
    vendor() {NotImplemented();}
    supportsPartialUpdates() {NotImplemented();}
    supportsConditionalQueries() {NotImplemented();}
    insert(collection, key, data) {NotImplemented();}
    update(collection, key, data) {NotImplemented();}
    del(collection, key) {NotImplemented();}
    find(collection, key) {NotImplemented();}
    findAll(collection, conditions) {NotImplemented();}
}

class DialectNoSqlException extends Error
{
    constructor(message)
    {
        super(message);
        this.name = "DialectNoSqlException";
    }
}

class DialectNoSql extends DialectORMEntity
{
    static collection = null;

    _str = null;
    data = null;
    isDirty = null;
    proxy = null;

    static async fetchByPk(id, default_ = null)
    {
        let klass = this, entity;
        entity = await DialectNoSql.NoSqlHandler().find(klass.collection, is_array(klass.pk) ? DialectNoSql.key(klass.pk, id) : id);
        return !empty(entity) ? new klass(is_array(entity) ? entity[0] : entity) : default_;
    }

    static async fetchAll(conditions = {}, default_ = [])
    {
        let klass = this, entities, i, l;
        if (DialectNoSql.NoSqlHandler().supportsConditionalQueries())
        {
            entities = await DialectNoSql.NoSqlHandler().findAll(klass.collection, conditions);
            if (empty(entities)) return default_;
            for (i = 0, l = entities.length; i < l; ++i)
            {
                entities[i] = new klass(entities[i]);
            }
            return entities;
        }
        return default_;
    }

    constructor(data = {})
    {
        super();
        this._str = null;
        this.data = null;
        this.isDirty = null;

        if (is_obj(data) && !empty(data))
            this._populate(data);

        // return the proxy
        this.proxy = new Proxy(this, magicMethodsProxy);
        return this.proxy;
    }

    storage()
    {
        if (!this._str) this._str = DialectNoSql.NoSqlHandler();
        return this._str;
    }

    async get(field, default_ = null, options = {})
    {
        if (is_array(field))
        {
            return await Promise.all(field.map(async (f, i) => await this.get(f, is_array(default_) ? default_[i] : default_, options)));
        }

        field = String(field);

        let klass = this.constructor;
        if (!is_obj(this.data) || !has(this.data, field))
        {
            throw new DialectNoSql.Exception('Undefined Field: "' + field + '" in ' + klass.name + ' via get()');
        }

        return this.data[field];
    }

    set(field, val = null, options = {})
    {
        if (is_array(field))
        {
            for (let i = 0, n = field.length; i < n; ++i)
                this.set(field[i], is_array(val) ? val[i] : val, options);
            return this.proxy;
        }

        field = String(field);

        let klass = this.constructor, tval, fieldProp, typecast, validate, valid;
        options = merge({
            'raw' : false
        }, options);

        tval = val;
        if (!options['raw'])
        {
            fieldProp = DialectNoSql.camelCase(field, true);

            typecast = 'type' + fieldProp;
            if ('function' === typeof this[typecast])
            {
                tval = this[typecast](val);
            }

            validate = 'validate' + fieldProp;
            if ('function' === typeof this[validate])
            {
                valid = this[validate](tval);
                if (!valid) throw new DialectNoSql.Exception('Value: "' + String(val) + '" is not valid for Field: "' + field + '" in ' + klass.name);
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
        return this.proxy;
    }

    has(field)
    {
        return is_obj(this.data) && has(this.data, field);
    }

    clear()
    {
        this.data = null;
        this.isDirty = null;
        return this.proxy;
    }

    __call(method, args, proxy)
    {
        let prefix = method.slice(0, 3), field;
        if ('get' === prefix)
        {
            field = DialectNoSql.snake_case(method.slice(3));
            return args.length ? this.get(field, args[0]) : this.get(field);
        }

        else if ('set' === prefix)
        {
            field = DialectNoSql.snake_case(method.slice(3));
            return this.set(field, !args.length ? null : args[0], 1<args.length ? args[1] : {});
        }

        else if ('has' === prefix)
        {
            field = DialectNoSql.snake_case(method.slice(3));
            return this.has(field);
        }

        else
        {
            throw new ReferenceError('Undefined access "' + method + '" in ' + this.constructor.name);
        }
    }

    _populate(data)
    {
        if (empty(data)) return this.proxy;

        let klass = this.constructor, hydrateFromDB, i, n;
        if (is_array(klass.pk))
        {
            hydrateFromDB = true
            for (i = 0, n = klass.pk.length; i < n; ++i)
                hydrateFromDB = hydrateFromDB && has(data, klass.pk[i]) && !empty(data[klass.pk[i]]);
        }
        else
        {
            hydrateFromDB = has(data, klass.pk) && !empty(data[klass.pk]);
        }
        for (i in data)
        {
            if (has(data, i))
                this.set(i, data[i]);
        }
        // populated from DB hydration, clear dirty flags
        if (hydrateFromDB) this.isDirty = Object.create(null);
        return this.proxy;
    }

    toObj(diff = false)
    {
        let a = {}, i, l, fields = Object.keys(this.data).sort();
        for (i = 0, l = fields.length; i < l; ++i)
        {
            if (diff && !has(this.isDirty, fields[i])) continue;
            a[fields[i]] = this.data[fields[i]];
        }
        return a;
    }

    async save(options = {})
    {
        options = merge({
            'update' : false,
        }, options);

        let res = 0, pk, id, klass = this.constructor;

        if (!empty(this.isDirty))
        {
            pk = klass.pk;
            id = this.primaryKey();
            if (DialectNoSql.emptykey(id))
            {
                throw new DialectNoSql.Exception('Empty key in ' + klass.name + '.save()');
            }

            await this.beforeSave();

            if (options['update'])
            {
                // update
                res = await this.storage().update(klass.collection, is_array(pk) ? DialectNoSql.key(pk, id) : id, this.toObj(this.storage().supportsPartialUpdates()));
            }
            else
            {
                // insert
                res = await this.storage().insert(klass.collection, is_array(pk) ? DialectNoSql.key(pk, id) : id, this.toObj(false));
            }


            this.isDirty = Object.create(null);

            await this.afterSave(res);
        }

        return res;
    }

    async del(options = {})
    {
        options = merge({}, options);

        let klass = this.constructor, res = 0, pk, id;

        if (is_obj(this.data))
        {
            pk = klass.pk;
            id = this.primaryKey();
            if (!DialectNoSql.emptykey(id))
            {
                // delete
                res = await this.storage().del(klass.collection, is_array(pk) ? DialectNoSql.key(pk, id) : id);
            }
            this.clear();
        }

        return res;
    }
}

DialectNoSql.VERSION = DialectORM.VERSION;
DialectNoSql.Exception = DialectNoSqlException;
DialectNoSql.INoSql = IDialectORMNoSql;

DialectNoSql.NoSqlHandler = function(store = null) {
    if (arguments.length)
    {
        if (!(store instanceof IDialectORMNoSql))
            throw new DialectNoSql.Exception('DialectNoSql Store must implement DialectORM.NoSql.INoSql');
        DialectNoSql.strh = store;
    }
    return DialectNoSql.strh;
};

DialectORM.NoSql = DialectNoSql;

// utils
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
    return is_array(o) ? (-1 !== o.indexOf(k)) : (Object.prototype.hasOwnProperty.call(o, k));
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
function eq(a, b)
{
    if (is_array(a) && is_array(b))
    {
        if (a.length === b.length)
        {
            for (let i = 0, n = a.length; i < n; ++i)
                if (a[i] !== b[i]) return false;
            return true;
        }
        return false;
    }
    return a === b;
}
function array(x)
{
    return is_array(x) ? x : [x];
}
function NotImplemented()
{
    throw new Error('DialectORM: Method Not Implemented Error!');
}

const magicMethodsProxy = {
    get: function(target, prop, receiver)  {
        const proxy = this;

        // Does prop exists? Is it a method?
        if ('function' === typeof(target[prop]))
        {
            // Wrap it around a function and return it
            return function(...args) {
                // in order to preserve the default arguments the method may have, we pass undefined
                // instead of an empty arguments object
                let value = target[prop].apply(target, (args.length ? args : undefined));
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
            ('get' === prop.slice(0,3) || 'set' === prop.slice(0,3) || 'has' === prop.slice(0,3) || 'assoc' === prop.slice(0,5) || 'dissoc' === prop.slice(0,6))
        )
        {
            return function(...args) {
                let value = target.__call(prop, args, proxy);
                // it is important to return the proxy instead of the target in order to make
                // future calls to this method
                return value === target ? proxy : value;
            };
        }
    }
};

// export it
return DialectORM;
});
