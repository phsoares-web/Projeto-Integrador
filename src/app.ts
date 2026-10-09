import express from "express";
import path from "node:path";

const app = express();
const publicDirectory = path.resolve(process.cwd(), "public");

app.use(express.static(publicDirectory));

export default app;
