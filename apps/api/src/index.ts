import express from "express";
import { User } from "@mixmatch/types";

const app = express();
const port = 3001;

app.get("/", (req, res) => {
  const user: User = { id: "1", role: "DJ", email: "test@dj.com" };
  res.json({ message: "MixMatch API Running", user });
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
