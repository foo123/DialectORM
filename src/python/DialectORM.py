##
#   DialectORM,
#   tiny, fast, super-simple but versatile Object-Relational-Mapper with Relationships for PHP, JavaScript, Python
#
#   @version: 1.1.0
#   https://github.com/foo123/DialectORM
##

import re, time, abc, inspect, functools
from collections import OrderedDict

def ucfirst(s):
    return s[0].upper() + s[1:]

def lcfirst(s):
    return s[0].lower() + s[1:]

def empty(arg):
    if isinstance(arg, str):
        return ('0'==arg) or (not len(arg))
    return (not arg)


GUID = 0
def guid( ):
    global GUID
    GUID += 1
    return str(hex(int(time.time()))[2:])+'__'+str(hex(GUID)[2:])

def createFunction( args, sourceCode, additional_symbols=dict() ):
    # http://code.activestate.com/recipes/550804-create-a-restricted-python-function-from-a-string/

    funcName = 'tinyorm_func_' + guid( )

    # The list of symbols that are included by default in the generated
    # function's environment
    SAFE_SYMBOLS = [
        "list", "dict", "enumerate", "tuple", "set", "long", "float", "object",
        "bool", "callable", "True", "False", "dir",
        "frozenset", "getattr", "hasattr", "abs", "cmp", "complex",
        "divmod", "id", "pow", "round", "slice", "vars",
        "hash", "hex", "int", "isinstance", "issubclass", "len",
        "map", "filter", "max", "min", "oct", "chr", "ord", "range",
        "reduce", "repr", "str", "type", "zip", "xrange", "None",
        "Exception", "KeyboardInterrupt"
    ]

    # Also add the standard exceptions
    __bi = __builtins__
    if type(__bi) is not dict:
        __bi = __bi.__dict__
    for k in __bi:
        if k.endswith("Error") or k.endswith("Warning"):
            SAFE_SYMBOLS.append(k)
    del __bi

    # Include the sourcecode as the code of a function funcName:
    s = "def " + funcName + "(%s):\n" % args
    s += sourceCode # this should be already properly padded

    # Byte-compilation (optional)
    byteCode = compile(s, "<string>", 'exec')

    # Setup the local and global dictionaries of the execution
    # environment for __TheFunction__
    bis   = dict() # builtins
    globs = dict()
    locs  = dict()

    # Setup a standard-compatible python environment
    bis["locals"]  = lambda: locs
    bis["globals"] = lambda: globs
    globs["__builtins__"] = bis
    globs["__name__"] = "SUBENV"
    globs["__doc__"] = sourceCode

    # Determine how the __builtins__ dictionary should be accessed
    if type(__builtins__) is dict:
        bi_dict = __builtins__
    else:
        bi_dict = __builtins__.__dict__

    # Include the safe symbols
    for k in SAFE_SYMBOLS:

        # try from current locals
        try:
          locs[k] = locals()[k]
          continue
        except KeyError:
          pass

        # Try from globals
        try:
          globs[k] = globals()[k]
          continue
        except KeyError:
          pass

        # Try from builtins
        try:
          bis[k] = bi_dict[k]
        except KeyError:
          # Symbol not available anywhere: silently ignored
          pass

    # Include the symbols added by the caller, in the globals dictionary
    globs.update(additional_symbols)

    # Finally execute the Function statement:
    eval(byteCode, globs, locs)

    # As a result, the function is defined as the item funcName
    # in the locals dictionary
    fct = locs[funcName]
    # Attach the function to the globals so that it can be recursive
    del locs[funcName]
    globs[funcName] = fct

    # Attach the actual source code to the docstring
    fct.__doc__ = sourceCode

    # return the compiled function object
    return fct

def import_module(name, path):
    import imp
    mod_fp = None
    try:
        mod_fp, mod_path, mod_desc  = imp.find_module(name, [path])
        mod = getattr(imp.load_module(name, mod_fp, mod_path, mod_desc), name)
    except ImportError as exc:
        mod = None
    finally:
        if mod_fp: mod_fp.close()
    return mod

def eq(a, b):
    if isinstance(a, (list,tuple)) and isinstance(b, (list,tuple)):
        if len(a) == len(b):
            for i in range(len(a)):
                if a[i] != b[i]: return False
            return True
        return False
    return a == b

def array(x):
    return list(x) if isinstance(x, (list,tuple)) else [x]

Dialect = None

# interface
class IDialectORMDb(abc.ABC):
    @abc.abstractmethod
    def vendor(self): raise NotImplementedError
    @abc.abstractmethod
    def escape(self, str): raise NotImplementedError
    @abc.abstractmethod
    def escapeWillQuote(self): raise NotImplementedError
    @abc.abstractmethod
    def query(self, sql): raise NotImplementedError
    @abc.abstractmethod
    def get(self, sql): raise NotImplementedError


class DialectORMException(Exception):
    pass


class DialectORMRelation:
    def __init__(self, type, a, b, kb, ka = None, ab = None):
        self.type = str(type).lower()
        self.a = a
        self.b = b
        self.keya = ka
        self.keyb = kb
        self.ab = ab
        self.field = None
        self.data = False

class DialectORM:
    """
    DialectORM for Python,
    https://github.com/foo123/DialectORM
    """

    VERSION = '1.1.0'

    Exception = DialectORMException
    Relation = DialectORMRelation
    IDb = IDialectORMDb

    deps = {}
    dbh = None
    tblprefix = ''

    table = None
    pk = None
    fields = []
    relationships = {}

    @staticmethod
    def dependencies(deps):
        DialectORM.deps.update(deps)

    @staticmethod
    def dependency(dep, default = None):
        return DialectORM.deps[dep] if dep in DialectORM.deps else default

    @staticmethod
    def DBHandler(db = None):
        if db is not None:
            if not isinstance(db, IDialectORMDb):
                raise DialectORM.Exception('DialectORM DB must implement DialectORM.IDb')
            DialectORM.dbh = db
        return DialectORM.dbh

    @staticmethod
    def SQLBuilder():
        global Dialect
        if not Dialect:
            entry = DialectORM.dependency('Dialect')
            if entry:
                if isinstance(entry, (list,tuple)):
                    Dialect = import_module(str(entry[1]) if 1<len(entry) else 'Dialect', str(entry[0]))
                elif isinstance(entry, str):
                    Dialect = import_module('Dialect', entry)
                elif inspect.isclass(entry):
                    Dialect = entry
        db = DialectORM.DBHandler()
        sql = Dialect(db.vendor())
        sql.escape(db.escape, db.escapeWillQuote())
        if hasattr(db, 'escapeId') and callable(getattr(db, 'escapeId')):
            sql.escapeId(db.escapeId, db.escapeIdWillQuote() if hasattr(db, 'escapeIdWillQuote') and callable(getattr(db, 'escapeIdWillQuote')) else False)
        return sql

    @staticmethod
    def prefix(prefix = None):
        if prefix is not None:
            DialectORM.tblprefix = str(prefix)
        return DialectORM.tblprefix

    @staticmethod
    def tbl(table):
        return DialectORM.prefix() + str(table)

    @staticmethod
    def snake_case( s, sep='_' ):
        s = re.sub('[A-Z]', lambda m: sep + m.group(0).lower(), lcfirst(s))
        return s[1:] if sep == s[0]  else s

    @staticmethod
    def camelCase( s, PascalCase = False, sep = '_' ):
        s = re.sub(re.escape(sep)+'([a-z])', lambda m: m.group(1).upper(), s)
        return ucfirst(s) if PascalCase else s

    @staticmethod
    def key(k, v, conditions = dict(), prefix = ''):
        if isinstance(k, (list,tuple)):
            for i in range(len(k)):
                conditions[prefix + k[i]] = v[i]
        else:
            conditions[prefix + k] = v
        return conditions

    @staticmethod
    def strkey(k):
        if isinstance(k, (list, tuple)):
            return ':&:'.join(list(map(lambda ki: str(ki), k)))
        else:
            return str(k)

    @staticmethod
    def emptykey(k):
        if isinstance(k, (list, tuple)):
            return empty(k) or (len(k) > len(list(filter(lambda ki: not empty(ki), k))))
        else:
            return empty(k)

    eq = eq

    @staticmethod
    def pluck(entities, field = ''):
        if '' == field:
            return list(map(lambda entity: entity.primaryKey(), entities))
        else:
            return list(map(lambda entity: entity.get(field), entities))

    @classmethod
    def sorter(klass, args = list()):
        # Array multi - sorter utility
        # returns a sorter that can (sub-)sort by multiple (nested) fields
        # each ascending or descending independantly

        # + before a (nested) field indicates ascending sorting (default),
        # example "+a.b.c"
        # - before a (nested) field indicates descending sorting,
        # example "-b.c.d"
        l = len(args)
        if l:
            step = 1
            sorter = []
            variables = []
            sorter_args = []
            filter_args = [];
            for i in range(l-1, -1, -1):
                field = args[i]
                # if is array, it contains a filter function as well
                filter_args.insert(0, 'f'+str(i))
                if isinstance(field, (list,tuple)):
                    sorter_args.insert(0, field[1])
                    field = field[0]
                else:
                    sorter_args.insert(0, None)
                field = str(field)
                dir = field[0]
                if '-' == dir:
                    desc = True
                    field = field[1:]
                elif '+' == dir:
                    desc = False
                    field = field[1:]
                else:
                    # default ASC
                    desc = False

                field = ''.join(list(map(lambda f: '' if not len(f) else (('['+f+']') if re.search(r'^\d+$', f) else ('.get'+DialectORM.camelCase(f, True)+'()')), field.split('.')))) if len(field) else ''
                a = "a"+field
                b = "b"+field
                if sorter_args[0]:
                    a = filter_args[0] + '(' + a + ')'
                    b = filter_args[0] + '(' + b + ')'
                avar = 'a_'+str(i)
                bvar = 'b_'+str(i)
                variables.insert(0, bvar+'='+b)
                variables.insert(0, avar+'='+a)
                lt = str(step) if desc else ('-'+str(step))
                gt = ('-'+str(step)) if desc else str(step)
                sorter.insert(0, "("+lt+" if "+avar+" < "+bvar+" else ("+gt+" if "+avar+" > "+bvar+" else 0))")
                step <<= 1

            # use optional custom filters as well
            comparator = (createFunction(
                    ','.join(filter_args),
                    "\n".join([
                    '    def sorter(a,b):',
                    '        '+"\n        ".join(variables),
                    '        return '+'+'.join(sorter),
                    '    return sorter'
                    ])
                    ))(*sorter_args)
            return functools.cmp_to_key(comparator)
        else:
            a = "a"
            b = "b"
            lt = '-1'
            gt = '1'
            sorter = lt+" if "+a+" < "+b+" else ("+gt+" if "+a+" > "+b+" else 0)"
            comparator = createFunction('a,b', '    return '+sorter)
            return functools.cmp_to_key(comparator)

    @classmethod
    def fetchByPk(klass, id, default = None):
        entity = DialectORM.DBHandler().get(
            DialectORM.SQLBuilder().Select(
                    klass.fields
                ).From(
                    DialectORM.tbl(klass.table)
                ).Where(
                    DialectORM.key(klass.pk, id, {})
                ).sql()
        )
        return klass(entity[0] if isinstance(entity, list) else entity) if not empty(entity) else default

    @classmethod
    def count(klass, opts = dict()):
        options = {'conditions' : {}}
        options.update(opts)

        sql = DialectORM.SQLBuilder().Select(
            'COUNT(*) AS cnt'
            ).From(
                DialectORM.tbl(klass.table)
            ).Where(
                options['conditions']
            )

        res = DialectORM.DBHandler().get(sql.sql())
        return res[0]['cnt']

    @classmethod
    def fetchAll(klass, opts = dict(), default = list()):
        options = {
            'conditions': {},
            'order': OrderedDict(),
            'limit': None,
            'single': False,
            'withRelated': [],
            'related': {},
        }
        options.update(opts)

        retSingle = options['single']
        if retSingle and empty(default):
            default = None

        pk = klass.pk
        sql = DialectORM.SQLBuilder().Select(
                klass.fields
            ).From(
                DialectORM.tbl(klass.table)
            ).Where(
                options['conditions']
            )

        if not empty(options['order']):
            for field in options['order']:
                sql.Order(field, options['order'][field])

        if options['limit'] is not None:
            if isinstance(options['limit'], (list,tuple)):
                sql.Limit(options['limit'][0], options['limit'][1] if 1<len(options['limit']) else 0)
            else:
                sql.Limit(options['limit'], 0)
        elif retSingle:
            sql.Limit(1, 0)

        entities = DialectORM.DBHandler().get(sql.sql())

        if empty(entities): return default

        for i in range(len(entities)):
            entities[i] = klass(entities[i])

        if options['withRelated']:
            # eager optimised (no N+1 issue) loading of selected relations
            ids = klass.pluck(entities)
            for field in options['withRelated']:
                field = str(field)
                if field not in klass.relationships: continue
                rel = klass.relationships[field]
                type = rel[0].lower()
                cls = rel[1]
                conditions = {}
                if 'hasone' == type:
                    fk = rel[2]
                    if isinstance(fk, (list,tuple)):
                        conditions[DialectORM.strkey(fk)] = {'or':[DialectORM.key(fk, id, {}) for id in ids]}
                    else:
                        conditions[fk] = {'in':ids}
                    if field in options['related'] and 'conditions' in options['related'][field]:
                        conditions2 = options['related'][field]['conditions'].copy()
                        conditions2.update(conditions)
                        conditions = conditions2
                    rentities = cls.fetchAll({
                        'conditions' : conditions
                    })
                    mapp = {}
                    for re in rentities:
                        mapp[DialectORM.strkey(re.get(fk))] = re
                    for e in entities:
                        kv = str(e.primaryKey())
                        e.set(field, mapp[kv] if kv in mapp else None)

                elif 'hasmany' == type:
                    fk = rel[2]
                    if field in options['related'] and 'limit' in options['related'][field]:
                        sql = DialectORM.SQLBuilder()
                        selects = []
                        for id in ids:
                            conditions = DialectORM.key(fk, id, {})
                            if field in options['related'] and 'conditions' in options['related'][field]:
                                conditions2 = options['related'][field]['conditions'].copy()
                                conditions2.update(conditions)
                                conditions = conditions2

                            subquery = sql.subquery().Select(
                                cls.fields
                            ).From(
                                DialectORM.tbl(cls.table)
                            ).Where(
                                conditions
                            )
                            if field in options['related'] and 'order' in options['related'][field]:
                                for ofield in options['related'][field]['order']:
                                    subquery.Order(ofield, options['related'][field]['order'][ofield])

                            if isinstance(options['related'][field]['limit'], (list,tuple)):
                                subquery.Limit(options['related'][field]['limit'][0], options['related'][field]['limit'][1] if 1<len(options['related'][field]['limit']) else 0)
                            else:
                                subquery.Limit(options['related'][field]['limit'], 0)

                            selects.append(subquery.sql())

                        rentities = DialectORM.DBHandler().get(sql.Union(selects, False).sql())
                        for i in range(len(rentities)):
                            rentities[i] = cls(rentities[i])
                    else:
                        conditions = {}
                        if isinstance(fk, (list,tuple)):
                            conditions[DialectORM.strkey(fk)] = {'or':[DialectORM.key(fk, id, {}) for id in ids]}
                        else:
                            conditions[fk] = {'in':ids}
                        if field in options['related'] and 'conditions' in options['related'][field]:
                            conditions2 = options['related'][field]['conditions'].copy()
                            conditions2.update(conditions)
                            conditions = conditions2
                        rentities = cls.fetchAll({
                            'conditions' : conditions,
                            'order' : options['related'][field]['order'] if field in options['related'] and 'order' in options['related'][field] else OrderedDict()
                        })

                    mapp = {}
                    for re in rentities:
                        fkv = DialectORM.strkey(re.get(fk))
                        if fkv not in mapp: mapp[fkv] = [re]
                        else: mapp[fkv].append(re)
                    for e in entities:
                        kv = DialectORM.strkey(e.primaryKey())
                        e.set(field, mapp[kv] if kv in mapp else [])

                elif 'belongsto' == type:
                    fk = rel[2]
                    rpk = cls.pk
                    fids = klass.pluck(entities, fk)
                    if isinstance(rpk, (list,tuple)):
                        conditions[DialectORM.strkey(rpk)] = {'or':[DialectORM.key(rpk, id, {}) for id in fids]}
                    else:
                        conditions[rpk] = {'in':fids}
                    if field in options['related'] and 'conditions' in options['related'][field]:
                        conditions2 = options['related'][field]['conditions'].copy()
                        conditions2.update(conditions)
                        conditions = conditions2
                    rentities = cls.fetchAll({
                        'conditions' : conditions
                    })
                    mapp = {}
                    for re in rentities:
                        mapp[DialectORM.strkey(re.primaryKey())] = re
                    for e in entities:
                        fkv = DialectORM.strkey(e.get(fk))
                        e.set(field, mapp[fkv] if fkv in mapp else None, {'recurse':True,'merge':True})

                elif 'belongstomany' == type:
                    ab = DialectORM.tbl(rel[4])
                    fk = rel[2]
                    pk2 = rel[3]
                    rpk = cls.pk
                    if isinstance(pk2, (list,tuple)):
                        conditions[DialectORM.strkey(pk2)] = {'or':[DialectORM.key(pk2, id, {}) for id in ids]}
                    else:
                        conditions[pk2] = {'in':ids}
                    reljoin = DialectORM.DBHandler().get(
                        DialectORM.SQLBuilder().Select(
                            '*'
                        ).From(
                            ab
                        ).Where(
                            conditions
                        ).sql()
                    )
                    fids = list(map((lambda d: list(map(lambda k: d[k], fk))) if isinstance(fk, (list,tuple)) else (lambda d: d[fk]), reljoin))
                    if (not empty(fids)) and (field in options['related'] and 'limit' in options['related'][field]):
                        sql = DialectORM.SQLBuilder()
                        selects = []
                        for id in fids:
                            conditions = DialectORM.key(rpk, id, {})
                            if field in options['related'] and 'conditions' in options['related'][field]:
                                conditions2 = options['related'][field]['conditions'].copy()
                                conditions2.update(conditions)
                                conditions = conditions2

                            subquery = sql.subquery().Select(
                                cls.fields
                            ).From(
                                DialectORM.tbl(cls.table)
                            ).Where(
                                conditions
                            )
                            if field in options['related'] and 'order' in options['related'][field]:
                                for ofield in options['related'][field]['order']:
                                    subquery.Order(ofield, options['related'][field]['order'][ofield])

                            if isinstance(options['related'][field]['limit'], (list,tuple)):
                                subquery.Limit(options['related'][field]['limit'][0], options['related'][field]['limit'][1] if 1<len(options['related'][field]['limit']) else 0)
                            else:
                                subquery.Limit(options['related'][field]['limit'], 0)

                            selects.append(subquery.sql())

                        rentities = DialectORM.DBHandler().get(sql.Union(selects, False).sql())
                        for i in range(len(rentities)):
                            rentities[i] = cls(rentities[i])
                    else:
                        conditions = {}
                        if isinstance(rpk, (list,tuple)):
                            conditions[DialectORM.strkey(rpk)] = {'or':[DialectORM.key(rpk, id, {}) for id in fids]}
                        else:
                            conditions[rpk] = {'in':fids}
                        if field in options['related'] and 'conditions' in options['related'][field]:
                            conditions2 = options['related'][field]['conditions'].copy()
                            conditions2.update(conditions)
                            conditions = conditions2
                        rentities = cls.fetchAll({
                            'conditions' : conditions,
                            'order' : options['related'][field]['order'] if field in options['related'] and 'order' in options['related'][field] else OrderedDict()
                        })

                    mapp = {}
                    for re in rentities:
                        mapp[DialectORM.strkey(re.primaryKey())] = re
                    relmapp = {}
                    for d in reljoin:
                        k1 = DialectORM.strkey([d[k] for k in pk2] if isinstance(pk2, (list,tuple)) else d[pk2])
                        k2 = DialectORM.strkey([d[k] for k in fk] if isinstance(fk, (list,tuple)) else d[fk])
                        if k2 in mapp:
                            if k1 not in relmapp: relmapp[k1] = [mapp[k2]]
                            else: relmapp[k1].append(mapp[k2])
                    for e in entities:
                        k1 = DialectORM.strkey(e.primaryKey())
                        e.set(field, relmapp[k1] if k1 in relmapp else [])

        return entities[0] if retSingle else entities

    @classmethod
    def deleteAll(klass, opts = dict()):
        options = {
            'conditions' : {},
            'limit' : None,
            'withRelated' : False
        }
        options.update(opts)

        ids = None
        if not empty(options['withRelated']):
            ids = klass.pluck(klass.fetchAll({'conditions':options['conditions'], 'limit':options['limit']}))
            for field in klass.relationships:
                rel = klass.relationships[field]
                type = rel[0].lower()
                cls = rel[1]
                conditions = {}
                if 'belongsto'==type:
                    # bypass
                    pass
                elif 'belongstomany'==type:
                    # delete relation from junction table
                    fk = rel[3]
                    if isinstance(fk, (list,tuple)):
                        conditions[DialectORM.strkey(fk)] = {'or':[DialectORM.key(fk, id, {}) for id in ids]}
                    else:
                        conditions[fk] = {'in':ids}
                    DialectORM.DBHandler().query(
                        DialectORM.SQLBuilder().Delete(
                            ).From(
                                DialectORM.tbl(rel[4])
                            ).Where(
                                conditions
                            ).sql()
                    )
                else:
                    fk = rel[2]
                    if isinstance(fk, (list,tuple)):
                        conditions[DialectORM.strkey(fk)] = {'or':[DialectORM.key(fk, id, {}) for id in ids]}
                    else:
                        conditions[fk] = {'in':ids}
                    cls.deleteAll({
                        'conditions' : conditions,
                        'withRelated' : True
                    })
        if isinstance(ids, list):
            pk = klass.pk
            conditions = {}
            if isinstance(pk, (list,tuple)):
                conditions[DialectORM.strkey(pk)] = {'or':[DialectORM.key(pk, id, {}) for id in ids]}
            else:
                conditions[pk] = {'in':ids}
            sql = DialectORM.SQLBuilder().Delete(
                ).From(
                    DialectORM.tbl(klass.table)
                ).Where(
                    conditions
                )
        else:
            sql = DialectORM.SQLBuilder().Delete(
                ).From(
                    DialectORM.tbl(klass.table)
                ).Where(
                    options['conditions']
                )
            if options['limit'] is not None:
                if isinstance(options['limit'], (list,tuple)):
                    sql.Limit(options['limit'][0], options['limit'][1] if 1<len(options['limit']) else 0)
                else:
                    sql.Limit(options['limit'], 0)
        res = DialectORM.DBHandler().query(sql.sql())
        res = res['affectedRows'];
        return res

    def __init__(self, data = dict()):
        self._sql = None
        self.relations = {}
        self.data = None
        self.isDirty = None
        if isinstance(data, dict) and not empty(data):
            self._populate(data)

    def db(self):
        return DialectORM.DBHandler()

    def sql(self):
        if not self._sql: self._sql = DialectORM.SQLBuilder()
        return self._sql

    def get(self, field, default = None, opts = dict()):
        if isinstance(field, (list,tuple)):
            return [self.get(f, default[i] if isinstance(default, (list,tuple)) else default, opts) for i, f in enumerate(field)]

        field = str(field)
        klass = self.__class__
        if field in klass.relationships:
            return self._getRelated(field, default, opts)
        if (not isinstance(self.data, dict)) or (field not in self.data):
            if field in klass.fields: return default
            raise DialectORM.Exception('Undefined Field: "'+field+'" in ' + klass.__name__ + ' via get()')

        return self.data[field]

    def _getRelated(self, field, default = None, opts = dict()):
        klass = self.__class__
        rel = None
        if isinstance(field, DialectORM.Relation):
            rel = field
            field = rel.field
        elif field in self.relations:
            rel = self.relations[field]
        elif field in klass.relationships:
            type = klass.relationships[field][0]
            a = klass
            b = klass.relationships[field][1]
            kb = klass.relationships[field][2]
            ka = klass.relationships[field][3] if 3<len(klass.relationships[field]) else None
            ab = klass.relationships[field][4] if 4<len(klass.relationships[field]) else None
            rel = DialectORM.Relation(type, a, b, kb, ka, ab)
            rel.field = field
            self.relations[field] = rel

        if rel:
            options = {
                'conditions' : {},
                'order' : OrderedDict(),
                'limit' : None
            }
            options.update(opts)

            if (rel.type in ['hasmany','belongstomany']) and empty(default):
                default = []

            if rel.data is False:

                if 'hasone' == rel.type or 'hasmany' == rel.type:
                    cls = rel.b
                    fk = rel.keyb
                    if 'hasone' == rel.type:
                        rel.data = cls.fetchAll({
                            'conditions' : DialectORM.key(fk, self.primaryKey(), {}),
                            'single' : True
                        })
                    else:
                        rel.data = cls.fetchAll({
                            'conditions' : DialectORM.key(fk, self.primaryKey(), options['conditions'].copy()),
                            'order' : options['order'],
                            'limit' : options['limit']
                        })
                    if rel.data:
                        mirrorRel = self._getMirrorRel(rel)
                        if mirrorRel:
                            if isinstance(rel.data, list):
                                for entity in rel.data:
                                    #entity.set(rel.keyb, self.primaryKey())
                                    entity.set(mirrorRel['field'], self, {'recurse':False})
                            else:
                                entity = rel.data
                                #entity.set(rel.keyb, self.primaryKey())
                                entity.set(mirrorRel['field'], self, {'recurse':False})
                elif 'belongsto' == rel.type:
                    cls = rel.b
                    rel.data = cls.fetchByPk(self.get(rel.keyb), None)
                    if rel.data:
                        mirrorRel = self._getMirrorRel(rel)
                        if mirrorRel:
                            entity = rel.data
                            entity.set(mirrorRel['field'], self if 'hasone'==mirrorRel['type'] else [self], {'recurse':False,'merge':True})
                elif 'belongstomany' == rel.type:
                    cls = rel.b
                    tbl = DialectORM.tbl(cls.table)
                    jtbl = DialectORM.tbl(rel.ab)
                    jon = {}
                    pk = array(cls.pk)
                    fk = array(rel.keyb)
                    for i in range(len(pk)): jon[tbl + '.' + pk[i]] = jtbl + '.' + fk[i]
                    fields = cls.fields
                    for i in range(len(fields)): fields[i] = tbl + '.' + fields[i] + ' AS ' + fields[i]
                    self.sql().clear().Select(
                        fields
                    ).From(
                        tbl
                    ).Join(
                        jtbl, jon, 'inner'
                    ).Where(
                        DialectORM.key(rel.keya, self.primaryKey(), options['conditions'].copy(), jtbl + '.')
                    )

                    if not empty(options['order']):
                        for field in options['order']:
                            self.sql().Order(field, options['order'][field])

                    if options['limit'] is not None:
                        if isinstance(options['limit'], (list,tuple)):
                            self.sql().Limit(options['limit'][0], options['limit'][1] if 1<len(options['limit']) else 0)
                        else:
                            self.sql().Limit(options['limit'], 0)

                    rel.data = list(map(lambda data: cls(data), self.db().get(str(self.sql()))))

            return default if not rel.data else rel.data

        return default

    def primaryKey(self, default = 0):
        klass = self.__class__
        return self.get(klass.pk, default)

    def set(self, field, val = None, opts = dict()):
        if isinstance(field, (list,tuple)):
            for i, f in enumerate(field):
                self.set(f, val[i] if isinstance(val, (list,tuple)) else val, opts)
            return self

        field = str(field)
        options = {
            'raw' : False,
            'recurse' : True,
            'merge' : False
        }
        options.update(opts)
        klass = self.__class__

        if field in klass.relationships:
            return self._setRelated(field, val, options)

        if field not in klass.fields:
            raise DialectORM.Exception('Undefined Field: "'+field+'" in ' + klass.__name__ + ' via set()')

        tval = val
        if not options['raw']:
            fieldProp = DialectORM.camelCase(field, True)

            typecast = 'type' + fieldProp
            try:
                typecaster = getattr(self, typecast)
            except AttributeError:
                typecaster = None
            if callable(typecaster):
                tval = typecaster(val)

            validate = 'validate' + fieldProp
            try:
                validator = getattr(self, validate)
            except AttributeError:
                validator = None
            if callable(validator):
                valid = validator(tval)
                if not valid: raise DialectORM.Exception('Value: "'+str(val)+'" is not valid for Field: "'+field+'" in '+klass.__name__)

        if not isinstance(self.data, dict):
            self.data = {}
            self.isDirty = {}
        if (field not in self.data) or (self.data[field] is not tval):
            self.isDirty[field] = True
            self.data[field] = tval
        return self

    def _setRelated(self, field, data, opts = dict()):
        klass = self.__class__
        rel = None
        if isinstance(field, DialectORM.Relation):
            rel = field
            field = rel.field
        elif field in self.relations:
            rel = self.relations[field]
        elif field in klass.relationships:
            type = klass.relationships[field][0]
            a = klass
            b = klass.relationships[field][1]
            kb = klass.relationships[field][2]
            ka = klass.relationships[field][3] if 3<len(klass.relationships[field]) else None
            ab = klass.relationships[field][4] if 4<len(klass.relationships[field]) else None
            rel = DialectORM.Relation(type, a, b, kb, ka, ab)
            rel.field = field
            self.relations[field] = rel

        if rel:
            options = opts
            if options['merge'] and isinstance(data, list) and isinstance(rel.data, list):
                pks = [DialectORM.strkey(k) for k in klass.pluck(rel.data)]
                for d in data:
                    dpk = d.primaryKey()
                    # add entities that do not exist already
                    sk = DialectORM.strkey(dpk)
                    if DialectORM.emptykey(dpk) or (sk not in pks):
                        rel.data.append(d)
                        if not DialectORM.emptykey(dpk): pks.append(sk)
            else:
                rel.data = data

            if options['recurse'] and not empty(rel.data):
                mirrorRel = self._getMirrorRel(rel)
                if mirrorRel:
                    if 'belongsto' == mirrorRel['type']:
                        pk = self.primaryKey()
                        if isinstance(rel.data, list):
                            for entity in rel.data:
                                entity.set(rel.keyb, pk)
                                entity.set(mirrorRel['field'], self, {'recurse':False})
                        else:
                            entity = rel.data
                            entity.set(rel.keyb, pk)
                            entity.set(mirrorRel['field'], self, {'recurse':False})
                    elif 'hasone' == mirrorRel['type']:
                        entity = rel.data
                        entity.set(mirrorRel['field'], self, {'recurse':False})
                    elif 'hasmany' == mirrorRel['type']:
                        entity = rel.data
                        entity.set(mirrorRel['field'], [self], {'recurse':False,'merge':True})

        return self

    def _getMirrorRel(self, rel):
        if 'hasone' == rel.type or 'hasmany' == rel.type:
            thisclass = self.__class__
            cls = rel.b
            for f in cls.relationships:
                r = cls.relationships[f]
                if 'belongsto' == r[0].lower() and thisclass == r[1] and eq(rel.keyb, r[2]):
                    return {'type':'belongsto', 'field':f}
        elif 'belongsto' == rel.type:
            thisclass = self.__class__
            cls = rel.b
            for f in cls.relationships:
                r = cls.relationships[f]
                if ('hasone' == r[0].lower() or 'hasmany' == r[0].lower()) and thisclass == r[1] and eq(rel.keyb, r[2]):
                    return {'type':r[0].lower(), 'field':f}

        return None

    def has(self, field):
        field = str(field)
        klass = self.__class__
        return (field not in klass.relationships) and (isinstance(self.data, dict) and (field in self.data))

    def assoc(self, field, entity):
        field = str(field)
        klass = self.__class__
        if field not in klass.relationships:
            raise DialectORM.Exception('Undefined Field: "'+field+'" in ' + klass.__name__ + ' via assoc()')
        id = self.primaryKey()
        if not DialectORM.emptykey(id):
            rel = klass.relationships[field]
            type = rel[0].lower()
            cls = rel[1]
            if 'belongstomany' == type:
                jtbl = TnyORM.tbl(rel[4])
                eids = []
                for ent in entity:
                    if not isinstance(ent, cls): continue
                    eid = ent.primaryKey()
                    if DialectORM.emptykey(eid): continue
                    eids.append(eid)

                conditions = DialectORM.key(rel[3], id, {})
                if isinstance(rel[2], (list,tuple)):
                    conditions[DialectORM.strkey(rel[2])] = {'or':[DialectORM.key(rel[2], id, {}) for id in eids]}
                else:
                    conditions[rel[2]] = {'in':eids}
                exists = list(map(lambda v: DialectORM.strkey(list(map(lambda k: v[k], array(rel[2])))), [] if empty(eids) else self.db().get(
                    self.sql().clear().Select(
                        rel[2]
                    ).From(
                        jtbl
                    ).Where(
                        conditions
                    ).sql()
                )))

                values = []
                for ent in entity:
                    if not isinstance(ent, cls): continue
                    eid = ent.primaryKey()
                    if DialectORM.emptykey(eid): continue
                    sk = DialectORM.strkey(eid)
                    if sk not in exists:
                        exists.append(sk)
                        values.append(array(eid) + array(id))

                if not empty(values):
                    self.db().query(
                        self.sql().clear().Insert(
                            jtbl, array(rel[2]) + array(rel[3])
                        ).Values(
                            values
                        ).sql()
                    )
                self.sql().clear()
            elif 'belongsto' == type:
                if isinstance(entity, cls) and not DialectORM.emptykey(entity.primaryKey()):
                    self.set(rel[2], entity.primaryKey()).save()
            elif 'hasone' == type:
                if isinstance(entity, cls):
                    entity.set(rel[2], id).save()
            elif 'hasmany' == type:
                for ent in entity:
                    if not isinstance(ent, cls): continue
                    ent.set(rel[2], id).save()

        return self

    def dissoc(self, field, entity):
        field = str(field)
        klass = self.__class__
        if field not in klass.relationships:
            raise DialectORM.Exception('Undefined Field: "'+field+'" in ' + klass.__name__ + ' via dissoc()')
        id = self.primaryKey()
        if not DialectORM.emptykey(id):
            rel = klass.relationships[field]
            type = rel[0].lower()
            cls = rel[1]
            if 'belongstomany' == type:
                jtbl = DialectORM.tbl(rel[4])
                values = []
                for ent in entity:
                    if not isinstance(ent, cls): continue
                    eid = ent.primaryKey()
                    if DialectORM.emptykey(eid): continue
                    values.append(eid)
                if not empty( values):
                    conditions = DialectORM.key(rel[3], id, {})
                    if isinstance(rel[2], (list,tuple)):
                        conditions[DialectORM.strkey(rel[2])] = {'or':[DialectORM.key(rel[2], id, {}) for id in values]}
                    else:
                        conditions[rel[2]] = {'in':values}
                    self.db().query(
                        self.sql().clear().Delete(
                        ).From(
                            jtbl
                        ).Where(
                            conditions
                        ).sql()
                    )
                    self.sql().clear()
            elif 'belongsto' == type:
                pass
            elif 'hasone' == type:
                pass
            elif 'hasmany' == type:
                pass

        return self

    def clear(self):
        self.data = None
        self.isDirty = None
        for rel in self.relations: self.relations[rel].data = None
        return self

    def beforeSave(self):
        pass

    def afterSave(self, result = 0):
        pass

    # magic method calls simulated
    def __getattr__(self, method):
        prefix = method[0:3]
        if 'get' == prefix:
            field = DialectORM.snake_case(method[3:])
            def getter(*args):
                return self.get(field, args[0], args[1] if 1<len(args) else {}) if len(args) else self.get(field)
            return getter

        elif 'set' == prefix:
            field = DialectORM.snake_case(method[3:])
            def setter(*args):
                return self.set(field, None if not len(args) else args[0], args[1] if 1<len(args) else {})
            return setter

        elif 'has' == prefix:
            field = DialectORM.snake_case(method[3:])
            def haser(*args):
                return self.has(field)
            return haser

        elif 'assoc' == method[0:5]:
            field = DialectORM.snake_case(method[5:])
            def assocer(*args):
                return self.assoc(field, args[0])
            return assocer

        elif 'dissoc' == method[0:6]:
            field = DialectORM.snake_case(method[6:])
            def dissocer(*args):
                return self.dissoc(field, args[0])
            return dissocer

        else:
            raise AttributeError('Undefined access "'+method+'" in ' + self.__class__.__name__)

    def _populate(self, data):
        if empty(data): return self

        klass = self.__class__
        if isinstance(klass.pk, (list,tuple)):
            hydrateFromDB = True
            for k in klass.pk:
                hydrateFromDB = hydrateFromDB and (k in data) and not empty(data[k])
        else:
            hydrateFromDB = (klass.pk in data) and not empty(data[klass.pk])
        for field in klass.fields:
            if field in data:
                self.set(field, data[field])
            else:
                hydrateFromDB = False
                if not self.has(field):
                    self.set(field, None)
        # populated from DB hydration, clear dirty flags
        if hydrateFromDB: self.isDirty = {}
        return self

    def toDict(self, deep = False, diff = False, stack = list()):
        klass = self.__class__
        if klass in stack: return None
        a = {}
        for field in klass.fields:
            if diff and (field not in self.isDirty): continue
            a[field] = self.get(field)
        if deep and not diff:
            stack.append(klass)
            for field in klass.relationships:
                if (field not in self.relations) or empty(self.relations[field].data): continue

                entity = self.get(field)
                data = None

                if isinstance(entity, list):
                    data = []
                    for e in entity:
                        d = e.toDict(True, False, stack)
                        if not empty(d): data.append(d)
                else:
                    data = entity.toDict(True, False, stack)

                if not empty(data): a[field] = data
            stack.pop()
        return a

    def save(self, opts = dict()):
        options = {
            'force' : False,
            'withRelated' : False
        }
        options.update(opts)

        res = 0

        klass = self.__class__

        if options['withRelated'] is True: withRelated = klass.relationships.keys()
        elif options['withRelated'] is False: withRelated = []
        else: withRelated = array(options['withRelated'])

        for field in withRelated:
            field = str(field)
            if field not in self.relations: continue
            rel = self.relations[field]
            entity = rel.data
            cls = rel.b
            if (rel.type in ['belongsto']) and isinstance(entity, cls):
                entity.save()
                self.set(rel.keyb, entity.primaryKey())

        pk = klass.pk
        if not empty(self.isDirty):
            self.beforeSave()

            id = self.get(pk)
            if not DialectORM.emptykey(id) and not options['force']:
                # update
                self.sql().clear().Update(
                    DialectORM.tbl(klass.table)
                ).Set(
                    self.toDict(False, True)
                ).Where(
                    DialectORM.key(pk, id, {})
                )
            else:
                # insert
                self.sql().clear().Insert(
                    DialectORM.tbl(klass.table), klass.fields
                ).Values(
                    list(map(lambda f: self.data[f] if f in self.data else None, klass.fields))
                )


            res = self.db().query(str(self.sql()))
            if DialectORM.emptykey(id): self.set(pk, [res['insertId']] if isinstance(pk, (list,tuple)) else res['insertId'])
            res = res['affectedRows']
            self.isDirty = {}

            self.afterSave(res)

        id = self.get(pk)
        if not DialectORM.emptykey(id):
            for field in withRelated:
                field = str(field)
                if (field not in self.relations) or (self.relations[field].type in ['belongsto']): continue
                rel = self.relations[field]
                cls = rel.b
                if rel.data:
                    if isinstance(rel.data, list):
                        if 'hasmany' == rel.type:
                            for entity in rel.data:
                                if isinstance(entity, cls):
                                    entity.set(rel.keyb, id)
                        for entity in rel.data:
                            if isinstance(entity, cls):
                                entity.save()
                    else:
                        entity = rel.data
                        if 'hasone' == rel.type:
                            if isinstance(entity, cls):
                                entity.set(rel.keyb, id)
                        if isinstance(entity, cls):
                            entity.save()

                    if 'belongstomany' == rel.type:
                        jtbl = DialectORM.tbl(rel.ab)
                        entities = rel.data
                        eids = []
                        for entity in entities:
                            if not isinstance(entity, cls): continue
                            eid = entity.primaryKey()
                            if DialectORM.emptykey(eid): continue
                            eids.append(eid)

                        # the most cross-platform way seems to do an extra select to check if relation already exists
                        # https://stackoverflow.com/questions/13041023/insert-on-duplicate-key-update-nothing-using-mysql/13041065
                        conditions = DialectORM.key(rel.keya, id, {})
                        if isinstance(rel.keyb, (list,tuple)):
                            conditions[DialectORM.strkey(rel.keyb)] = {'or':[DialectORM.key(rel.keyb, id, {}) for id in eids]}
                        else:
                            conditions[rel.keyb] = {'in':eids}
                        exists = list(map(lambda v: DialectORM.strkey(list(map(lambda k: v[k], array(rel.keyb)))), [] if empty(eids) else self.db().get(
                            self.sql().clear().Select(
                                rel.keyb
                            ).From(
                                jtbl
                            ).Where(
                                conditions
                            ).sql()
                        )))

                        values = []
                        for entity in entities:
                            if not isinstance(entity, cls): continue
                            eid = entity.primaryKey()
                            if DialectORM.emptykey(eid): continue
                            sk = DialectORM.strkey(eid)
                            if sk not in exists:
                                exists.append(sk)
                                values.append(array(eid) + array(id))

                        if not empty(values):
                            self.db().query(
                                self.sql().clear().Insert(
                                    jtbl, array(rel.keyb) + array(rel.keya)
                                ).Values(
                                    values
                                ).sql()
                            )


        self.sql().clear()
        return res

    def delete(self, opts = dict()):
        options = {
            'withRelated' : False
        }
        options.update(opts)

        res = 0

        klass = self.__class__
        if isinstance(self.data, dict):
            pk = klass.pk
            id = self.get(pk)
            if not DialectORM.emptykey(id):
                # delete
                res = klass.deleteAll({
                    'conditions' : DialectORM.key(pk, id, {}),
                    'withRelated' : options['withRelated']
                })
            self.clear()

        return res


__all__ = ['DialectORM']
