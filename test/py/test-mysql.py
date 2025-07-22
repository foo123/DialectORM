#!/usr/bin/env python
# venv\Scripts\activate, deactivate
import os, sys
import json
#import asyncio
#import warnings
#warnings.filterwarnings("ignore", category=DeprecationWarning)

DIR = os.path.dirname(os.path.abspath(__file__))

def import_module(name, path):
    #import imp
    #try:
    #    mod_fp, mod_path, mod_desc  = imp.find_module(name, [path])
    #    mod = getattr( imp.load_module(name, mod_fp, mod_path, mod_desc), name )
    #except ImportError as exc:
    #    mod = None
    #    sys.stderr.write("Error: failed to import module ({})".format(exc))
    #finally:
    #    if mod_fp: mod_fp.close()
    #return mod
    import importlib.util, sys
    spec = importlib.util.spec_from_file_location(name, path+name+'.py')
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return getattr(mod, name)

# import the DialectORM.py (as a) module, probably you will want to place this in another dir/package
Dialect = import_module('Dialect', os.path.join(DIR, '../../../Dialect/src/python/'))
DialectORM = import_module('DialectORM', os.path.join(DIR, '../../src/py/'))
if not Dialect or not DialectORM:
    print ('Could not load the Dialect/DialectORM Module(s)')
    sys.exit(1)

from sql.mysql import getDB
if not getDB:
    print ('Could not load the getDB')
    sys.exit(1)

DialectORM.dependencies({
    'Dialect' : Dialect#os.path.join(DIR, '../../../Dialect/src/python/') # provide actual class, i.e Dialect or directory of module, i.e DIR
})
DialectORM.DBHandler(getDB(DialectORM)({
    'db' : 'dialectorm',
    'user' : 'dialectorm',
    'password' : 'dialectorm'
}, 'mysql'))

class Post(DialectORM):
    table = 'posts'
    pk = ['id']
    fields = ['id', 'content']
    extra_fields = ['postmeta', 'post_id', 'id', 'key', 'value']
    relationships = {}

    def typeId(self, x):
        return int(x) if x is not None else 0

    def typeContent(self, x):
        return str(x)

    def validateContent(self, x):
        return 0 < len(x)

class PostStatus(DialectORM):
    table = 'poststatus'
    pk = ['id']
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
    pk = ['id']
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
    pk = ['id']
    fields = ['id', 'name']
    relationships = {}

    def typeId(self, x):
        return int(x) if x is not None else 0

    def typeName(self, x):
        return str(x)

    def validateName(self, x):
        return 0 < len(x)


Post.relationships = {
    'status' : ['hasOne', PostStatus, ['post_id']],
    'comments' : ['hasMany', Comment, ['post_id']],
    'authors' : ['belongsToMany', User, ['user_id'], ['post_id'], 'user_post']
}
PostStatus.relationships = {
    'post' : ['belongsTo', Post, ['post_id']]
}
Comment.relationships = {
    'post' : ['belongsTo', Post, ['post_id']]
}
User.relationships = {
    'posts' : ['belongsToMany', Post, ['post_id'], ['user_id'], 'user_post']
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

    post = Post.fetchAll({'conditions' : {'content' : 'a py post..'},'single' : True})
    if not post:
        post = Post({'content':'a py post..'})
        post.setCustomField3('custom value 3')
        post.setComments([Comment({'content':'a py comment..'})])
        post.setComments([Comment({'content':'one more py comment..'})], {'merge':True})
        post.setAuthors([User({'name':'a py user'})])
        post.setStatus(PostStatus({'status':'approved','type':'article'}))
        post.save({'withRelated':True})
    else:
        val = post.getCustomField3()
        if 'custom value 3'==val:
            post.setCustomField3('custom value 33')
            post.save({'withRelated':True})
        elif 'custom value 33'==val:
            post.setCustomField3('custom value 3')
            post.save({'withRelated':True})

    output(post)

    print('Posts:')
    output(Post.fetchAll({'withRelated' : ['status', 'comments', 'authors']}))

    print('Posts:')
    output(Post.fetchAll({
        'conditions' : {'condition' : {'or' : [
            {'custom_field3' : 'custom value 3'},
            {'custom_field3' : 'custom value 33'}
        ]}},
        'withRelated' : ['status', 'comments', 'authors'],
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