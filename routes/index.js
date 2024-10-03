var express = require('express');
var router = express.Router();
const userModel = require('./users')
const postModel = require('./post')
const storyModel = require('./story')
const upload = require('./multer');
const utils = require("../utils/utils");



var passport = require('passport')
var localStrategy = require('passport-local')
passport.use(new localStrategy(userModel.authenticate()))


// THIS ROUTE REGISTER THE USER
router.post('/register', function (req, res) {
  var newUser = {
    //user data here 
    username: req.body.username,
    email: req.body.email,
    fullname: req.body.name,
    //user data here
  };
  userModel
    .register(newUser, req.body.password)
    .then((result) => {
      passport.authenticate('local')(req, res, () => {
        //destination after user register
        res.redirect('/profile');
      });
    })
    .catch((err) => {
      res.send(err);
    });
})

// HERE AUTHENTICATION STARTED
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/feed',
    failureRedirect: '/login',
  }),
  (req, res, next) => { }
);
router.get('/logout', (req, res) => {
  if (req.isAuthenticated())
    req.logout((err) => {
      if (err) res.send(err);
      else res.redirect('/');
    });
  else {
    res.redirect('/');
  }
});

function isloggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  else res.redirect('/login');
}




router.get('/', function (req, res) {
  res.render('index', { footer: false });
});


router.get('/login', function (req, res) {
  res.render('login', { footer: false });
});

// FEED PAGE 
router.get('/feed', isloggedIn, async function (req, res) {
  let user = await userModel.findOne({
    username: req.session.passport.user
  })
  .populate('posts');
  const story= await storyModel.find().populate('user')
  const post = await postModel.find().populate('user')
  res.render('feed', { footer:true , user , post , story});
  
});


router.get('/profile', isloggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user })
  .populate("posts")
  res.render('profile', { footer: true, user});
});

router.get('/search', isloggedIn,async function (req, res) {
  let user = await userModel.findOne({
    username: req.session.passport.user,
  });
  res.render('search', { footer: true , user});
});

router.get('/edit', isloggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user })
  res.render('edit', { footer: true, user });
});

//THIS IS FOR EDIT PAGE
router.post('/upload', isloggedIn, upload.single("image"), async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user })
  user.profileImage = req.file.filename;
  await user.save();
  res.redirect("/edit");
});

router.post('/update', isloggedIn, async function (req, res) {
  const user = await userModel.findOneAndUpdate({ username: req.session.passport.user }, { username: req.body.username, fullname: req.body.name, bio: req.body.bio }, { new: true })
  await user.save();
  req.login(user, function (err) {
    if (err) throw err;
    res.redirect("/profile")
  });
});


// This is for creating a post
router.get('/postupload', isloggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user })
  res.render('upload', { footer: true, user });
});


router.post('/postupload', isloggedIn, upload.single("image"), async function (req, res) {

  if (!req.file) {
    return req.status(404).send('No file were uploades.');
  }

  const user = await userModel.findOne({ username: req.session.passport.user })

  if(req.body.categories === "post"){
    const post = await postModel.create({
      user: user._id,
      picture: req.file.filename,
      caption: req.body.caption
    });
    user.posts.push(post._id)
  }

  else if(req.body.categories === "story"){
    const story = await storyModel.create({
      user: user._id,
      picture: req.file.filename,
    });
    user.stories.push(story._id)
  }
  
  
  await user.save();
  res.redirect('/feed');
  
});


//////////////////////////////////  FETCH ROUTES ////////////////////

//THIS FETCH IS FOR LIKE
router.get('/like/:postid' , isloggedIn , async function(req, res){
  const user =  await userModel.findOne({ username:  req.session.passport.user});
  const post = await postModel.findOne({ _id: req.params.postid});

  if (post.likes.indexOf(user._id) === -1) {
    post.likes.push(user._id);
  } else {
    post.likes.splice(post.likes.indexOf(user._id), 1);
  }

  await post.save();
  res.json(post);
  
})


//THIS FETCH IS FOR SEARCHING
router.get('/search/:user' , isloggedIn , async function(req, res){
  const searchTerm = `^${req.params.user}`;
  const regex = new RegExp(searchTerm);
  const user = await userModel.find({ username: { $regex: regex } });
  res.json(user);
})


//THIS FETCH IS FOR SAVE POST 
router.get('/save/:postid' , isloggedIn , async function(req, res){
  const user = await userModel.findOne({ username : req.session.passport.user});

  if (user.savedPost.indexOf(req.params.postid) === -1 )   {
    user.savedPost.push(req.params.postid);
  }
  else{
    let index = user.savedPost.indexOf(req.params.postid);
    user.savedPost.splice( index,1);
  }
  await user.save();
  res.json(user);
  
})

module.exports = router;
