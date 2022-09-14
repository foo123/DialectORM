#!/usr/bin/env python

import os, sys
import json

DIR = os.path.dirname(os.path.abspath(__file__))

def import_module(name, path):
    import imp
    try:
        mod_fp, mod_path, mod_desc  = imp.find_module(name, [path])
        mod = getattr( imp.load_module(name, mod_fp, mod_path, mod_desc), name )
    except ImportError as exc:
        mod = None
        sys.stderr.write("Error: failed to import module ({})".format(exc))
    finally:
        if mod_fp: mod_fp.close()
    return mod

# import the DialectORM.py (as a) module, probably you will want to place this in another dir/package
DialectORM = import_module('DialectORM', os.path.join(DIR, '../../src/python/'))
if not DialectORM:
    print ('Could not load the DialectORM Module')
    sys.exit(1)
else:
    pass


from nosql.redis import getStorage

DialectORM.NoSql.NoSqlHandler(getStorage(DialectORM.NoSql)({
    'host' : '127.0.0.1',
    'port' : 6379,
    'namespace' : 'dialectorm:'
}))

class Tweet(DialectORM.NoSql):
    collection = 'tweets'
    pk = ['id']

    def typeId(self, x):
        return int(x) if x is not None else 0

    def typeContent(self, x):
        return str(x)

    def validateContent(self, x):
        return 0 < len(x)


def output(data):
    if isinstance(data, list):
        print(json.dumps(list(map(lambda d: d.toDict(), data)), indent=4))
    elif isinstance(data, DialectORM.NoSql):
        print(json.dumps(data.toDict(), indent=4))
    else:
        print(str(data))

def test():
    output(Tweet.fetchByPk(3))
    #tweet = Tweet({'content' : 'hello redis3!'});
    #tweet.setId(3)
    #tweet.save()
    output(Tweet.fetchByPk(3));

test()