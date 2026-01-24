import express from "express";
const app = express();
const port = 3002;

app.get("/", (req, res) => {
  res.json({ service: "Stellar Service", status: "Active" });
});

app.listen(port, () => {
  console.log(`Stellar Service listening on port ${port}`);
});
