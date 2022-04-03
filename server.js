require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
});

// Mongoose stuff

const Schema = mongoose.Schema;

const exerciseSchema = new Schema({
    userId: { type: String, required: true },
    description: String,
    duration: Number,
    date: Date,
});

const userSchema = new Schema({
    username: String,
});

const Exercise = mongoose.model('Exercise', exerciseSchema);
const User = mongoose.model('User', userSchema);

app.post('/api/users', (req, res) => {
    //
    const newUser = new User({ username: req.body.username });
    newUser.save((err, data) => {
        if (err) {
            res.send(err);
        }
        res.send({ username: data.username, _id: data._id });
    });
});

app.get('/api/users', (req, res) => {
    User.find({}).then((users) => {
        res.send(users);
    });
});

app.post('/api/users/:_id/exercises', (req, res) => {
    const id = req.params._id;
    let iDate = req.body.date;

    if (!iDate) {
        iDate = new Date().toDateString();
    } else {
        iDate = new Date(iDate).toDateString();
    }

    User.findById(id, (err, foundUser) => {
        if (err || !foundUser) {
            res.send('Error or user was not found.');
        } else {
            const newExercise = new Exercise({
                userId: id,
                description: req.body.description,
                duration: req.body.duration,
                date: iDate,
            });

            newExercise.save((err, data) => {
                if (err) {
                    res.send(err);
                } else {
                    res.send({
                        username: foundUser.username,
                        description: data.description,
                        duration: data.duration,
                        date: iDate,
                        _id: data.userId,
                    });
                }
            });
        }
    });
});

app.get('/api/users/:id/logs', (req, res) => {
    let { from, to, limit } = req.query;
    const id = req.params.id;

    User.findById(id, (err, foundUser) => {
        if (err || !foundUser) {
            res.send('Error or user was not found.');
        } else {
            let dateObj = {};
            if (from) {
                dateObj['$gte'] = new Date(from);
            }

            if (to) {
                dateObj['$lte'] = new Date(to);
            }
            let filter = {
                userId: id,
            };

            if (from || to) {
                filter.date = dateObj;
            }

            if (!limit) {
                limit = 500;
            }

            Exercise.find(filter)
                .limit(limit)
                .exec((err, data) => {
                    if (err || !data) {
                        res.json([]);
                    } else {
                        const count = data.length;
                        const rawLog = data;
                        const { username, _id } = foundUser;
                        const log = rawLog.map((l) => ({
                            description: l.description,
                            duration: l.duration,
                            date: l.date.toDateString(),
                        }));
                        res.json({ _id, username, count, log });
                    }
                });
        }
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
});
