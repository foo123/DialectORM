# DialectORM

Tiny, fast, super-simple but versatile **Object-Relational-Mapper (ORM)** **with Relationships** and **Object-NoSql-Mapper** for **PHP**, **Python**, **JavaScript**


![DialectORM](/dialectorm.jpg)

**see also:**  

* [Importer](https://github.com/foo123/Importer) simple class &amp; dependency manager and loader for PHP, Python, Browser / Node.js / XPCOM JavaScript
* [Contemplate](https://github.com/foo123/Contemplate) a light-weight template engine for PHP, Python, Browser / Node.js / XPCOM JavaScript
* [HtmlWidget](https://github.com/foo123/HtmlWidget) html widgets used as (template) plugins and/or standalone for PHP, Python, Browser / Node.js / XPCOM JavaScript (can be used as plugins for Contemplate engine as well)
* [PublishSubscribe](https://github.com/foo123/PublishSubscribe) a simple and flexible publish-subscribe pattern implementation for PHP, Python, Browser / Node.js / XPCOM JavaScript
* [Dromeo](https://github.com/foo123/Dromeo) a flexible, agnostic router for PHP, Python, Browser / Node.js / XPCOM JavaScript
* [Dialect](https://github.com/foo123/Dialect) flexible cross-vendor &amp; cross-platform SQL Query Builder for PHP, Python, JavaScript
* [StringTemplate](https://github.com/foo123/StringTemplate) simple and flexible string templates for PHP, Python, Browser / Node.js / XPCOM JavaScript
* [GrammarTemplate](https://github.com/foo123/GrammarTemplate) versatile and intuitive grammar-based templating for PHP, Python, Browser / Node.js / XPCOM JavaScript
* [Xpresion](https://github.com/foo123/Xpresion) a simple and flexible eXpression parser engine (with custom functions and variables support) for PHP, Python, Browser / Node.js / XPCOM JavaScript
* [Regex Analyzer/Composer](https://github.com/foo123/RegexAnalyzer) Regular Expression Analyzer and Composer for PHP, Python, Browser / Node.js / XPCOM JavaScript
* [RT](https://github.com/foo123/RT) client-side real-time communication for Node/XPCOM/JS with support for Poll / BOSH / WebSockets
* [Asynchronous](https://github.com/foo123/asynchronous.js) a simple manager for async, linearised, parallelised, interleaved and sequential tasks for JavaScript
* [ModelView](https://github.com/foo123/modelview.js) a light-weight and flexible MVVM framework for JavaScript/HTML5
* [ModelView MVC jQueryUI Widgets](https://github.com/foo123/modelview-widgets) plug-n-play, state-full, full-MVC widgets for jQueryUI using modelview.js (e.g calendars, datepickers, colorpickers, tables/grids, etc..) (in progress)



**Dependencies:**

* [Dialect](https://github.com/foo123/Dialect)
* **PHP: 5.3+**
* **Python: 3+**
* **JavaScript: ES7+**

**Supports"**

* **Relational Datastores**: MySql, MariaDB, Postgresql, Sql Server, Sqlite
* **NoSql / Key-Value DataStores**: Redis, Mongodb (example in progress)
* Easily extyended to other NoSql Stores, via providing adapter


**example (see `/test` folder)**

```php
define('DIR', dirname(__FILE__));
include(DIR.'/../../src/php/DialectORM.php');
include(DIR.'/PDODb.php');

DialectORM::dependencies([
    'Dialect' => DIR.'/Dialect.php',
]);
DialectORM::DBHandler(new PDODb([
    'dsn' => 'mysql:host=localhost;dbname=dialectorm',
    'user' => 'dialectorm',
    'password' => 'dialectorm'
], 'mysql'));

class Post extends DialectORM
{
    public static $table = 'posts';
    public static $pk = 'id'; // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    public static $fields = ['id', 'content'];
    public static $relationships = [
        'meta' => ['hasOne', 'PostMeta', 'post_id'], // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
        'comments' => ['hasMany', 'Comment', 'post_id'], // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
        'authors' => ['belongsToMany', 'User', 'user_id', 'post_id', 'user_post'], // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    ];

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

class PostMeta extends DialectORM
{
    public static $table = 'postmeta';
    public static $pk = 'id'; // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    public static $fields = ['id', 'status', 'type', 'post_id'];
    public static $relationships = [
        'post' => ['belongsTo', 'Post', 'post_id'] // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    ];

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
    public static $pk = 'id'; // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    public static $fields = ['id', 'content', 'post_id'];
    public static $relationships = [
        'post' => ['belongsTo', 'Post', 'post_id'], // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    ];

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
    public static $pk = 'id'; // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    public static $fields = ['id', 'name'];
    public static $relationships = [
        'posts' => ['belongsToMany', 'Post', 'post_id', 'user_id', 'user_post'], // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    ];

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

$post = new Post(['content'=>'another post..']);
// alternative
//$post = new Post(); $post->setContent('another post..');

$post->setComments([new Comment(['content'=>'another comment..'])]);
$post->setComments([new Comment(['content'=>'still another comment..'])], ['merge'=>true]);

$post->setAuthors([new User(['name'=>'bar'])], ['merge'=>true]);

// alternative
//$user = new User(['name'=>'bar']);
//$user->save();
//$post->assocAuthors([$user]);

// to simply dissociate from a many-to-many relationship
//$post->dissocAuthors([$user]);

$post->save(['withRelated'=>['comments','authors']]);

//$post->delete(['withRelated'=>true]);

$count = Post::count(['conditions'=>[/*..*/]]);
$posts = Post::fetchAll(['withRelated'=>['comments','authors']]); // eager load of relationships, no N+1 problem

//foreach(Post::fetchAll() as $post) $post->getComments(); // lazy load of relationships, N+1 problem
```