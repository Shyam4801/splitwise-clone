// server.js
require('dotenv').config();


const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5002;
const SECRET_KEY = process.env.SECRET_KEY;

// MongoDB connection
mongoose.connect('mongodb://localhost/splitwise_clone', { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware
app.use(bodyParser.json());

const cors = require('cors');
app.use(cors());

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// Models
const User = mongoose.model('User', {
  username: String,
  password: String,
});

const Expense = mongoose.model('Expense', {
  payer: String,
  amount: Number,
  description: String,
  billImage: String,
  userId: mongoose.Schema.Types.ObjectId,
});

// Middleware for JWT authentication
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Routes
app.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({ username: req.body.username, password: hashedPassword });
    await user.save();
    res.status(201).send('User registered successfully');
  } catch (error) {
    res.status(500).send('Error registering user');
  }
});

app.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
      const token = jwt.sign({ id: user._id, username: user.username }, SECRET_KEY);
      res.json({ token });
    } else {
      res.status(400).send('Invalid credentials');
    }
  } catch (error) {
    res.status(500).send('Error logging in');
  }
});

app.post('/expenses', authenticateJWT, async (req, res) => {
  try {
    const expense = new Expense({ ...req.body, userId: req.user.id });
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).send('Error adding expense');
  }
});

app.get('/expenses', authenticateJWT, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.id });
    res.json(expenses);
  } catch (error) {
    res.status(500).send('Error fetching expenses');
  }
});

app.post('/upload-bill', authenticateJWT, upload.single('bill'), async (req, res) => {
  if (req.file) {
    res.json({ filename: req.file.filename });
  } else {
    res.status(400).send('No file uploaded');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});