import express from "express";
import path from "node:path";
import { router as textRouter } from "./routers/text.routers";
import { router as userRouter} from "./routers/user.routers";

const app = express();
const publicDirectory = path.resolve(process.cwd(), "public");

app.use(express.json({ limit: "1mb" }));
app.use("/api", textRouter);
app.use("/api", userRouter);
app.use(express.static(publicDirectory));

export default app;
