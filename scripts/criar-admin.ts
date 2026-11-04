// Cria uma conta de administrador ou promove uma conta existente.
// Uso: npm run admin:criar -- email@exemplo.com "Senha123" "Nome do Admin"
//      (se a conta já existir, só o e-mail é necessário: ela vira ADMIN)
import { prisma } from "../src/lib/prisma";
import { cadastrar as gerarHash } from "../src/middlewares/bcrypt";
import { User } from "../src/models/user.models";

async function main() {
  const [emailBruto, senha, nome] = process.argv.slice(2);
  if (!emailBruto) {
    console.error('Uso: npm run admin:criar -- email@exemplo.com "Senha123" "Nome do Admin"');
    process.exit(1);
  }
  const email = User.validarEmail(emailBruto);
  const existente = await prisma.usuario.findUnique({ where: { email } });

  if (existente) {
    await prisma.usuario.update({ where: { email }, data: { tipo: "ADMIN" } });
    console.log(`Conta ${email} promovida a ADMIN.`);
    return;
  }
  if (!senha || !nome) {
    console.error("Conta não encontrada. Para criar uma nova, informe também a senha e o nome.");
    process.exit(1);
  }
  await prisma.usuario.create({
    data: {
      email,
      nome: User.validarNome(nome),
      senha: await gerarHash(User.validarSenha(senha)),
      tipo: "ADMIN",
    },
  });
  console.log(`Administrador ${email} criado.`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
