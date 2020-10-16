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

DialectORM.dependencies({
    'Dialect' : Dialect # provide actual class, i.e Dialect or directory of module, i.e DIR
})
DialectORM.DBHandler(getDB(DialectORM)({
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

class PostMeta(DialectORM):
    table = 'postmeta'
    pk = 'id'
    fields = ['id', 'status', 'type', 'post_id']
    relationships = {}

    def typeId(self, x):
        return int(x) if x is not None else 0

    def typePostId(self, x):
        return int(x) if x is not None else 0

    def typeStatus(self, x):
        return str(x).lower()

    def typeType(self, x):
        return str(x).lower()

    def validateStatus(self, x):
        return x in ['approved', 'published', 'suspended']

    def validateType(self, x):
        return x in ['article', 'tutorial', 'general']

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
    'meta' : ['hasOne', PostMeta, 'post_id'],
    'comments' : ['hasMany', Comment, 'post_id'],
    'authors' : ['belongsToMany', User, 'user_id', 'post_id', 'user_post']
}
PostMeta.relationships = {
    'post' : ['belongsTo', Post, 'post_id']
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

    #post = Post({'content':'yet another py post..'})
    #post.setComments([Comment({'content':'yet still another py comment..'})])
    #post.setComments([Comment({'content':'yet one more py comment..'})], {'merge':True})
    #post.setAuthors([User({'name':'yet another py user'}), User.fetchByPk(4)])
    #post.setMeta(PostMeta({'status':'approved','type':'article'}))
    #post.save({'withRelated':True})

    #post2 = Post({'content':'py post to delete..'})
    #post2.save()

    print('Posts:')
    output(Post.fetchAll({'withRelated' : ['meta', 'comments', 'authors']}))

    #post2.delete()

    print('Posts:')
    output(Post.fetchAll({
        'withRelated' : ['meta', 'comments', 'authors'],
        'related' : {
            'authors' : {'conditions':{'clause':{'or':[
                {'name':{'like':'user'}},
                {'name':{'like':'foo'}},
                {'name':{'like':'bar'}}
            ]}}},
            'comments' : {'limit':1} # eager relationship loading with extra conditions, see `Dialect` lib on how to define conditions
        }
    }))

test()