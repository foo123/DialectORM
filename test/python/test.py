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


from MysqlDb import getDB
from Dialect import Dialect

DialectORM.setDependencies({
    'Dialect' : Dialect # provide actual class, i.e Dialect or directory of module, i.e DIR
})
DialectORM.setDB(getDB(DialectORM)({
    'db' : 'dialectorm',
    'user' : 'dialectorm',
    'password' : 'dialectorm'
}, 'mysql'))

class Post(DialectORM):
    table = 'posts'
    pk = 'id'
    fields = ['id', 'content']
    relationships = {}

    def typeId(self, x):
        return int(x) if x is not None else 0

    def typeContent(self, x):
        return str(x)

    def validateContent(self, x):
        return 0 < len(x)

class Comment(DialectORM):
    table = 'comments'
    pk = 'id'
    fields = ['id', 'content', 'post_id']
    relationships = {}

    def typeId(self, x):
        return int(x) if x is not None else 0

    def typeContent(self, x):
        return str(x)

    def typePostId(self, x):
        return int(x) if x is not None else 0

    def validateContent(self, x):
        return 0 < len(x)

class User(DialectORM):
    table = 'users'
    pk = 'id'
    fields = ['id', 'name']
    relationships = {}

    def typeId(self, x):
        return int(x) if x is not None else 0

    def typeName(self, x):
        return str(x)

    def validateName(self, x):
        return 0 < len(x)

Post.relationships = {
    'comments' : ['hasMany', Comment, 'post_id'],
    'users' : ['belongsToMany', User, 'user_id', 'post_id', 'user_post']
}
Comment.relationships = {
    'post' : ['belongsTo', Post, 'post_id']
}
User.relationships = {
    'posts' : ['belongsToMany', Post, 'post_id', 'user_id', 'user_post']
}

def output(data):
    if isinstance(data, list):
        print(json.dumps(list(map(lambda d: d.toDict(True), data)), indent=4))
    elif isinstance(data, DialectORM):
        print(json.dumps(data.toDict(True), indent=4))
    else:
        print(str(data))

def test():
    output('Posts: ' + str(Post.count()))
    output('Users: ' + str(User.count()))

    #post = Post({'content':'a py post..'})
    #post.setComments([Comment({'content':'a py comment..'})])
    #post.setComments([Comment({'content':'another py comment..'})], {'merge':True})
    #post.setUsers([User({'name':'py user'})])
    #post.save({'withRelated':True})

    #post2 = Post({'content':'py post to delete..'})
    #post2.save()

    print('Posts:')
    output(Post.getAll({'withRelated' : ['comments', 'users']}))

    #post2.delete()

    print('Posts:')
    output(Post.getAll({
        'withRelated' : ['comments', 'users'],
        'related' : {
            'comments' : {'conditions':{'content':{'like':'py'}}} # eager relationship loading with extra conditions, see `Dialect` lib on how to define conditions
        }
    }))

test()