let DialectORM = require('../../src/js/DialectORM.js');
let Dialect = require('./Dialect.js');
let MysqlDb = require('./MysqlDb.js')(DialectORM);

DialectORM.setDependencies({
    'Dialect' : Dialect // provide actual class, i.e Dialect or path of module
});
DialectORM.setDB(new MysqlDb({
    'database' : 'dialectorm',
    'user' : 'dialectorm',
    'password' : 'dialectorm'
}, 'mysql'));

class Post extends DialectORM
{
    static table = 'posts';
    static pk = 'id';
    static fields = ['id', 'content'];
    static relationships = {};

    typeId(x)
    {
        return parseInt(x, 10) || 0;
    }

    typeContent(x)
    {
        return String(x);
    }

    validateContent(x)
    {
        return 0 < x.length;
    }
}
class Comment extends DialectORM
{
    static table = 'comments';
    static pk = 'id';
    static fields = ['id', 'content', 'post_id'];
    static relationships = {};

    typeId(x)
    {
        return parseInt(x, 10) || 0;
    }

    typeContent(x)
    {
        return String(x);
    }

    typePostId(x)
    {
        return parseInt(x, 10) || 0;
    }

    validateContent(x)
    {
        return 0 < x.length;
    }
}
class User extends DialectORM
{
    static table = 'users';
    static pk = 'id';
    static fields = ['id', 'name'];
    static relationships = {};

    typeId(x)
    {
        return parseInt(x, 10) || 0;
    }

    typeName(x)
    {
        return String(x);
    }

    validateName(x)
    {
        return 0 < x.length;
    }
}
Post.relationships = {
    'comments' : ['hasMany', Comment, 'post_id'],
    'users' : ['belongsToMany', User, 'user_id', 'post_id', 'user_post']
};
Comment.relationships = {
    'post' : ['belongsTo', Post, 'post_id']
};
User.relationships = {
    'posts' : ['belongsToMany', Post, 'post_id', 'user_id', 'user_post']
};

function print(x)
{
    console.log(x);
}
function output(data)
{
    if (Array.isArray(data))
        print(JSON.stringify(data.map(d => d.toObj(true)), null, 4));
    else if (data instanceof DialectORM)
        print(JSON.stringify(data.toObj(true), null, 4));
    else
        print(String(data));
}

async function test()
{
    output('Posts: ' + String(await Post.count()));
    output('Users: ' + String(await User.count()));

    /*let post = new Post({'content':'a js post..'});
    post.setComments([new Comment({'content':'a js comment..'})]);
    post.setComments([new Comment({'content':'another js comment..'})], {'merge':true});
    post.setUsers([new User({'name':'js user'})]);
    await post.save({'withRelated':true});*/

    /*let post2 = new Post({'content':'js post to delete..'});
    await post2.save();*/

    print('Posts:');
    output(await Post.getAll({'withRelated' : ['comments', 'users']}));

    //await post2.del();

    print('Posts:');
    output(await Post.getAll({
        'withRelated' : ['comments', 'users'],
        'related' : {
        'comments' : {'conditions':{'content':{'like':'js'}}} // eager relationship loading with extra conditions, see `Dialect` lib on how to define conditions
        }
    }));
}

test().then(() => process.exit()).catch(e => {print(e); process.exit();});