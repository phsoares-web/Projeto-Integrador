import app from "./app";

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`PORT deve ser um número entre 1 e 65535; recebido: ${process.env.PORT}`);
}

app.listen(port, () => {
  console.log(`Servidor disponível em http://localhost:${port}`);
});
