const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const { json } = require("express/lib/response");
require("dotenv").config();

app.use(cors());
// body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
// CODE update by NDC

mongoose.connect(process.env.MONGO_URI).then((a) => {
  console.log("connect database successfully!");
});

// Create new model
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
});

const UserModel = mongoose.model("User", UserSchema);

const ExerciseSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: Number,
  date: Date
});

const ExerciseModel = new mongoose.model("Exercise", ExerciseSchema);

app.get("/api/removeAll", (req, res) => {
  UserModel.remove().exec();
  ExerciseModel.remove().exec();
  res.send("Remove all record in database");
});

app.get("/api/users", async (req, res) => {
  let users = await UserModel.find()
    .then((data) => data)
    .catch((err) => console.error(err));
  res.json(users);
});

app.post("/api/users", async (req, res) => {
  // console.log(req.body);
  let dataRecorded = await UserModel.find({ username: req.body.username })
    .then((data) => data[0])
    .catch((err) => console.error(err));

  let output = {
    username: req.body.username,
    _id: ""
  };

  if (dataRecorded) {
    output._id = dataRecorded._id;
    return res.json(output);
  }
  UserModel.create({ username: req.body.username }, (err, _newuser) => {
    if (err) return console.error(err);
    output._id = _newuser._id;
    res.json(output);
  });
  // res.json(req.body);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  let exercise = {
    user_id: req.params._id,
    description: req.body.description,
    duration: Number(req.body.duration),
    date: req.body.date ? new Date(req.body.date) : new Date()
  };

  let output = {
    _id: exercise.user_id,
    username: "",
    date: exercise.date.toDateString(),
    duration: exercise.duration,
    description: exercise.description
  };

  // console.log(output);

  // check user by _id
  let userRecorded = await UserModel.find({ _id: exercise.user_id })
    .then((user) => user[0])
    .catch((err) => console.error(err));

  if (!userRecorded) {
    return res
      .status(500)
      .send(
        `<pre style="word-wrap: break-word; white-space: pre-wrap;">Cast to ObjectId failed for value "${exercise.user_id}" at path "_id" for model "Users"</pre>`
      );
  }

  output.username = userRecorded.username;

  ExerciseModel.create(exercise, (err, new_exercise) => {
    if (err) return console.error(err);
    return res.json(output);
  });

  // res.json(exercise);
});

app.get("/api/users/:id/logs", async (req, res) => {
  let dateFrom = req.query["from"] ? new Date(req.query["from"]) : null;
  let dateTo = req.query["to"] ? new Date(req.query["to"]) : null;
  let logsLimit = req.query["limit"] ? Number(req.query["limit"]) : null;

  let output = {
    _id: req.params.id,
    username: "",
    from: dateFrom ? dateFrom.toDateString() : undefined,
    to: dateFrom ? dateTo.toDateString() : undefined,
    count: 0,
    log: [
      {
        description: "",
        duration: 0,
        date: new Date().toDateString()
      }
    ]
  };

  // get users
  let userRecorded = await UserModel.find({ _id: output._id })
    .then((user) => user[0])
    .catch((err) => console.error(err));

  if (!userRecorded) {
    return res
      .status(500)
      .send(
        `<pre style="word-wrap: break-word; white-space: pre-wrap;">Cast to ObjectId failed for value "${output._id}" at path "_id" for model "Users"</pre>`
      );
  }

  output.username = userRecorded.username;

  // get logs
  let queryExercise = ExerciseModel.find({ user_id: output._id });

  if (dateFrom) {
    if (dateTo && dateTo !== dateFrom) {
      queryExercise = queryExercise.find({
        date: {
          $gte: dateFrom,
          $lte: dateTo
        }
      });
    } else {
      queryExercise = queryExercise.find({
        date: {
          $gte: dateFrom
        }
      });
    }
  }

  if (logsLimit) {
    queryExercise = queryExercise.limit(logsLimit);
  }

  let logsData = await queryExercise
    .then((data) =>
      data.map((e) => {
        return {
          description: e.description,
          duration: e.duration,
          date: new Date(e.date).toDateString()
        };
      })
    )
    .catch((err) => console.error(err));

  output.log = logsData;
  output.count = logsData.length;

  // console.log("from to limit options: ", output);
  res.json(output);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
