const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

const methodOverride = require('method-override');

app.use(methodOverride('_method'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

mongoose.connect('mongodb://127.0.0.1:27017/datab', { useNewUrlParser: true, useUnifiedTopology: true, connectTimeoutMS: 90000 })
  .then(() => console.log('Connected to MongoDB'))
  .catch(error => console.error(error));

const userSchema = new mongoose.Schema({
  username: String,
  login: String,
  id_user: Number,
  avatar_url: String,
  name: String,
  location: String,
  public_repos: Number,
  followers: Number
});

const User = mongoose.model('User', userSchema);

const jwtSecret = 'your-secret-key';

const protectAdminPage = (req, res, next) => {
  const token = req.session.token;

  if (!token) {
    res.redirect('/login');
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error(error);
    res.redirect('/login');
  }
};

app.get('/', (req, res) => res.render('index', { user: null }));

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'adminpassword') {
    const payload = { username };
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

    req.session.token = token;
    res.redirect('/admin');
  } else {
    const errorMessage = 'Invalid credentials. Please try again.';
    res.render('login', { error: errorMessage });
    
  }
});

app.get('/user', (req, res) => {
  const username = req.query.username;
  if (!username) {
    res.redirect('/');
    return;
  }

  axios.get(`https://api.github.com/users/${username}`)
    .then(response => {
      const user = response.data;
      res.render('index', { user });
    })
    .catch(error => {
      console.error(error);
      res.render('index', { user: null });
    });
});

app.post('/save', (req, res) => {
  const username = req.body.username;
  const id_user = req.body.id_user;
  const location = req.body.location;
  const public_repos = req.body.public_repos;
  const name = req.body.name;
  const followers = req.body.followers;
  const avatar_url = req.body.username;

  User.findOne({ username })
    .then(user => {
      if (user) {
        res.send('User already exists in userHistory');
      } else {
        User.create({ username, id_user, name, location, avatar_url, public_repos, followers })
          .then(() => {
            console.log('User saved to userHistory');
            res.redirect('/');
          })
          .catch(error => {
            console.error(error);
            res.send('An error occurred while saving the user');
          });
      }
    })
    .catch(error => {
      console.error(error);
      res.send('An error occurred while checking the user');
    });
});

app.get('/admin', protectAdminPage, (req, res) => {
  User.find()
    .then(users => {
      res.render('admin', { users });
    })
    .catch(error => {
      console.error(error);
      res.send('An error occurred while retrieving users');
    });
});

app.delete('/admin/delete/:id_user', (req, res) => {
  const id_user = req.params.id_user;

  User.findOneAndDelete({ id_user: id_user })
    .then(() => {
      res.redirect('/admin');
    })
    .catch(error => {
      console.error(error);
      res.send('An error occurred while deleting the user');
    });
});

app.listen(port, () => console.log(`Server is running on port ${port}`));
