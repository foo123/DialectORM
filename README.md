# DialectORM

Super-simple, fast and versatile **Object-Relational-Mapper (ORM)** **with Relationships and Entity-Attribute-Value** and **Object-NoSql-Mapper** for PHP, Python, JavaScript


![DialectORM](/dialectorm.jpg)

version **2.1.0**


**Dependencies:**

* [Dialect](https://github.com/foo123/Dialect)
* **PHP: 5.3+**
* **Python: 3+**
* **JavaScript: ES7+**

**Supports:**

* **Relational Datastores**: MySql, MariaDB, Postgresql, Sql Server, Sqlite, easily extended to other Relational Stores via adding Dialect configuration
* **NoSql / Key-Value DataStores**: Redis, easily extended to other NoSql Stores via providing adapter


**example (see `/test` folder)**

```php
class Post extends DialectORM
{
    public static $table = 'posts';
    public static $pk = ['id'];
    public static $fields = ['id', 'content'];
    public static $extra_fields = ['postmeta', 'post_id', 'id', 'key', 'value'];
    public static $relationships = [];

    public function typeId($x)
    {
        return (int)$x;
    }

    public function typeContent($x)
    {
        return (string)$x;
    }

    public function validateContent($x)
    {
        return 0 < strlen($x);
    }
}

class PostStatus extends DialectORM
{
    public static $table = 'poststatus';
    public static $pk = ['id'];
    public static $fields = ['id', 'status', 'type', 'post_id'];
    public static $relationships = [];

    public function typeId($x)
    {
        return (int)$x;
    }

    public function typePostId($x)
    {
        return (int)$x;
    }

    public function typeStatus($x)
    {
        return strtolower((string)$x);
    }

    public function typeType($x)
    {
        return strtolower((string)$x);
    }

    public function validateStatus($x)
    {
        return in_array($x, ['approved', 'published', 'suspended']);
    }

    public function validateType($x)
    {
        return in_array($x, ['article', 'tutorial', 'general']);
    }
}

class Comment extends DialectORM
{
    public static $table = 'comments';
    public static $pk = ['id'];
    public static $fields = ['id', 'content', 'post_id'];
    public static $relationships = [];

    public function typeId($x)
    {
        return (int)$x;
    }

    public function typeContent($x)
    {
        return (string)$x;
    }

    public function typePostId($x)
    {
        return (int)$x;
    }

    public function validateContent($x)
    {
        return 0 < strlen($x);
    }
}

class User extends DialectORM
{
    public static $table = 'users';
    public static $pk = ['id'];
    public static $fields = ['id', 'name'];
    public static $relationships = [];

    public function typeId($x)
    {
        return (int)$x;
    }

    public function typeName($x)
    {
        return (string)$x;
    }

    public function validateName($x)
    {
        return 0 < strlen($x);
    }
}

Post::$relationships = [
    'status' => ['hasOne', 'PostStatus', ['post_id']],
    'comments' => ['hasMany', 'Comment', ['post_id']],
    'authors' => ['belongsToMany', 'User', ['user_id'], ['post_id'], 'user_post'],
];
PostStatus::$relationships = [
    'post' => ['belongsTo', 'Post', ['post_id']]
];
Comment::$relationships = [
    'post' => ['belongsTo', 'Post', ['post_id']],
];
User::$relationships = [
    'posts' => ['belongsToMany', 'Post', ['post_id'], ['user_id'], 'user_post'],
];

function output($data)
{
    if (is_array($data))
    {
        echo json_encode(array_map(function($d){return $d->toArray(true);}, $data), JSON_PRETTY_PRINT) . PHP_EOL;
    }
    elseif ($data instanceof DialectORM)
    {
        echo json_encode($data->toArray(true), JSON_PRETTY_PRINT) . PHP_EOL;
    }
    else
    {
        echo ((string)$data) . PHP_EOL;
    }
}

output('Posts: ' . (string)Post::count());
output('Users: ' . (string)User::count());

$post = Post::fetchAll(['conditions' => ['content' => 'a php post..'],'single' => true]);
if (empty($post))
{
    $post = new Post(['content'=>'a php post..']);
    $post->setCustomField1('custom value 1'); // extra custom fields as Entity-Attribute-Value pattern
    $post->setComments([new Comment(['content'=>'a php comment..'])]);
    $post->setComments([new Comment(['content'=>'one more php comment..'])], ['merge'=>true]);
    $post->setAuthors([new User(['name'=>'a php user'])]);
    $post->setStatus(new PostStatus(['status'=>'approved','type'=>'article']));
    $post->save(['withRelated'=>true]);
}
output($post);

print('Posts:');
output(Post::fetchAll([
    'conditions' => ['custom_field1' => 'custom value 1'],
    'withRelated' => ['status', 'comments', 'authors'],
    'related' => [
        'authors' => ['conditions'=>['clause'=>['or'=>[
            ['name'=>['like'=>'foo']],
            ['name'=>['like'=>'bar']]
        ]]]],
        'comments' => ['limit'=>1] // eager relationship loading with extra conditions, see `Dialect` lib on how to define conditions
    ]
]));
```

**see also:**

* [ModelView](https://github.com/foo123/modelview.js) a simple, fast, powerful and flexible MVVM framework for JavaScript
* [tico](https://github.com/foo123/tico) a tiny, super-simple MVC framework for PHP
* [LoginManager](https://github.com/foo123/LoginManager) a simple, barebones agnostic login manager for PHP, JavaScript, Python
* [SimpleCaptcha](https://github.com/foo123/simple-captcha) a simple, image-based, mathematical captcha with increasing levels of difficulty for PHP, JavaScript, Python
* [Dromeo](https://github.com/foo123/Dromeo) a flexible, and powerful agnostic router for PHP, JavaScript, Python
* [PublishSubscribe](https://github.com/foo123/PublishSubscribe) a simple and flexible publish-subscribe pattern implementation for PHP, JavaScript, Python
* [Localizer](https://github.com/foo123/Localizer) a simple and versatile localization class (l10n) for PHP, JavaScript, Python
* [Importer](https://github.com/foo123/Importer) simple class &amp; dependency manager and loader for PHP, JavaScript, Python
* [EazyHttp](https://github.com/foo123/EazyHttp), easy, simple and fast HTTP requests for PHP, JavaScript, Python
* [Contemplate](https://github.com/foo123/Contemplate) a fast and versatile isomorphic template engine for PHP, JavaScript, Python
* [HtmlWidget](https://github.com/foo123/HtmlWidget) html widgets, made as simple as possible, both client and server, both desktop and mobile, can be used as (template) plugins and/or standalone for PHP, JavaScript, Python (can be used as [plugins for Contemplate](https://github.com/foo123/Contemplate/blob/master/src/js/plugins/plugins.txt))
* [Paginator](https://github.com/foo123/Paginator)  simple and flexible pagination controls generator for PHP, JavaScript, Python
* [Formal](https://github.com/foo123/Formal) a simple and versatile (Form) Data validation framework based on Rules for PHP, JavaScript, Python
* [Dialect](https://github.com/foo123/Dialect) a cross-vendor &amp; cross-platform SQL Query Builder, based on [GrammarTemplate](https://github.com/foo123/GrammarTemplate), for PHP, JavaScript, Python
* [DialectORM](https://github.com/foo123/DialectORM) an Object-Relational-Mapper (ORM) and Object-Document-Mapper (ODM), based on [Dialect](https://github.com/foo123/Dialect), for PHP, JavaScript, Python
* [Unicache](https://github.com/foo123/Unicache) a simple and flexible agnostic caching framework, supporting various platforms, for PHP, JavaScript, Python
* [Xpresion](https://github.com/foo123/Xpresion) a simple and flexible eXpression parser engine (with custom functions and variables support), based on [GrammarTemplate](https://github.com/foo123/GrammarTemplate), for PHP, JavaScript, Python
* [Regex Analyzer/Composer](https://github.com/foo123/RegexAnalyzer) Regular Expression Analyzer and Composer for PHP, JavaScript, Python
