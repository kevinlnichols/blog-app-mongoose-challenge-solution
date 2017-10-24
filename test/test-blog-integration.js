const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
    console.info('seeding blog data');
    const seedData = [];
    for (let i = 1; i <= 5; i++) {
        seedData.push(generateBlogData());
    }
    return BlogPost.insertMany(seedData);
}

function generateBlogTitle() {
    const titles = ['A fair title', 'A good title', 'An excellent title'];
    return titles[Math.floor(Math.random()*titles.length)];
}

function generateBlogContent() {
    const content = ['This is a fair title', 'This is a good title', 'This is an excellent title'];
    return content[Math.floor(Math.random()*content.length)];
}

function generateBlogAuthor() {
    const firstName = ['Kevin', 'Julie', 'Finn'];
    const lastName = ['Nichols', 'Turner'];
    const first = firstName[Math.floor(Math.random() * firstName.length)];
    const last = lastName[Math.floor(Math.random() * lastName.length)];
    const author = first + last;
    return author;
}

function generateBlogData() {
    return {
       title: generateBlogTitle(),
       content: generateBlogContent(),
       author: generateBlogAuthor(), 
       created: new Date()
    }
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blog API resource', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedBlogData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

    describe('GET endpoint', function() {
        it('should return all existing blog posts', function() {
            let res;
            return chai.request(app)
                .get('/posts')
                .then(function(_res) {
                    res = _res;
                    res.should.have.status(200);
                    res.body.posts.should.have.length.of.at.least(1);
                    return BlogPost.count();
                })
                .then(function(count) {
                    res.body.posts.should.have.length.of(count);
                });
        });
        it('should return blog posts with correct fields', function() {
            let resBlog;
            return chai.request(app)
                .get('/posts')
                .then(function(res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.posts.should.be.a('array');
                    res.body.posts.should.have.length.of.at.least(1);
                    res.body.posts.forEach(function(post) {
                        post.should.be.a('object');
                        post.should.include.keys('id', 'title', 'content', 'author', 'created');
                    });    
                    resBlog = res.body.posts[0];
                    return BlogPost.findById(resBlog.id);          
                })
                .then(function(post) {
                    resBlog.id.should.equal(post.id);
                    resBlog.title.should.equal(post.title);
                    resBlog.content.should.equal(post.content);
                    resBlog.author.should.equal(post.author);
                    resBlog.created.should.equal(post.created);
                });
        });
    });
    
    describe('POST endpoint', function() {
        it('should add a new blog post', function() {
            const newPost = generateBlogData();
            return chai.request(app)
                .post('/posts')
                .send(newPost)
                .then(function(res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.a('object');
                    res.body.should.include.keys('id', 'title', 'content', 'author', 'created');
                    res.body.title.should.equal(newPost.title);
                    res.body.id.should.not.be.null;
                    res.body.content.should.equal(newPost.content);
                    res.body.author.should.equal(newPost.author);
                    res.body.created.should.equal(newPost.created);
                    return BlogPost.findById(res.body.id);
                })
                .then(function(post) {
                    post.title.should.equal(newPost.title);
                    post.content.should.equal(newPost.content);
                    post.author.firstName.should.equal(newPost.author.firstName);
                    post.author.lastName.should.equal(newPost.author.lastName);
                    post.created.should.equal(newPost.created);
                })
        });
    });

    describe('PUT endpoint', function() {
        it('should updated blog posts', function() {
            const updateData = {
                title: 'This is a poor title',
                content: 'I cannot believe you are updating this.'
            };
            return BlogPost
                .findOne()
                .then(function(post) {
                    updateData.id = post.id;
                    return chai.request(app)
                        .put(`/posts/${post.id}`)
                        .send(updateData);
                })
                .then(function(res) {
                    res.should.have.status(204);
                    return BlogPost.findById(updateData.id);
                })
                .then(function(post) {
                    post.title.should.equal(updateData.title);
                    post.content.should.equal(updateData.content);
                });
        });
    });

    describe('DELETE endpoint', function() {
        it('should delete a post by id', function() {
            let post;
            return BlogPost
                .findOne()
                .then(function(_post) {
                    post = _post;
                    return chai.request(app).delete(`/posts/${post.id}`);
                })
                .then(function(res) {
                    res.should.have.status(204);
                    return BlogPost.findById(post.id);
                })
                .then(function(_post) {
                    should.not.exist(_post);
                });
        });
    });
});