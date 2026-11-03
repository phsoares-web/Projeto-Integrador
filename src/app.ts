import express from "express";
import path from "node:path";
import { router as textRouter } from "./routers/text.routers";
import { router as userRouter} from "./routers/user.routers";
import { router as pageRouter } from "./routers/pages.routers";

const app = express();
const publicDirectory = path.resolve(process.cwd(), "public");

app.set('view engine', 'ejs');
app.set('views', path.resolve(process.cwd(), "views")); 

app.use(express.json({ limit: "1mb" }));
app.use("/api", textRouter);
app.use("/api", userRouter);
app.use("/", pageRouter );
app.use(express.static(publicDirectory));

export default app;
