<?php

define('DIR', dirname(__FILE__));
include(DIR . '/../../src/php/DialectORM.php');
include(DIR . '/sql/mysql.php');

DialectORM::dependencies([
    'Dialect' => DIR . '/../../../Dialect/src/php/Dialect.php',
]);
DialectORM::DBHandler(new PDODb([
    'dsn' => 'mysql:host=localhost;dbname=dialectorm',
    'user' => 'dialectorm',
    'password' => 'dialectorm'
], 'mysql'));

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

function test()
{
    output('Posts: ' . (string)Post::count());
    output('Users: ' . (string)User::count());

    $post = Post::fetchAll(['conditions' => ['content' => 'a php post..'],'single' => true]);
    if (empty($post))
    {
        $post = new Post(['content'=>'a php post..']);
        $post->setCustomField1('custom value 1');
        $post->setComments([new Comment(['content'=>'a php comment..'])]);
        $post->setComments([new Comment(['content'=>'one more php comment..'])], ['merge'=>true]);
        $post->setAuthors([new User(['name'=>'a php user'])]);
        $post->setStatus(new PostStatus(['status'=>'approved','type'=>'article']));
        $post->save(['withRelated'=>true]);
    }
    output($post);

    print('Posts:');
    output(Post::fetchAll(['withRelated' => ['status', 'comments', 'authors']]));

    print('Posts:');
    output(Post::fetchAll([
        'conditions' => ['custom_field1' => 'custom value 1'],
        'withRelated' => ['status', 'comments', 'authors'],
        'related' => [
            'authors' => ['conditions'=>['clause'=>['or'=>[
                ['name'=>['like'=>'user']],
                ['name'=>['like'=>'foo']],
                ['name'=>['like'=>'bar']]
            ]]]],
            'comments' => ['limit'=>1] // eager relationship loading with extra conditions, see `Dialect` lib on how to define conditions
        ]
    ]));
}

test();