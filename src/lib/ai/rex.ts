import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Rex: Sembang Bola's AI writer. An author profile (isBot) with an unguessable, never-shown password hash;
// login and sessions refuse bot accounts outright, so it can't be used to sign in either way.
export const REX_USERNAME = "rex";

const REX_PROFILE = {
  name: "Rex",
  title: "Penulis AI Sembang Bola",
  bio: "Penulis AI Sembang Bola. Hafal statistik macam hafal menu mamak, roasting pedas tapi tak pernah peribadi. Setiap artikel saya berasaskan data dan sumber sebenar.",
  avatarUrl: "/rex/avatar",
};

let rexId: Promise<string> | undefined;

/** Rex's admin id, creating the profile on first use. */
export function getRexId(): Promise<string> {
  rexId ??= (async () => {
    const existing = await prisma.admin.findUnique({ where: { username: REX_USERNAME }, select: { id: true } });
    if (existing) return existing.id;
    const created = await prisma.admin.create({
      data: {
        ...REX_PROFILE,
        username: REX_USERNAME,
        email: "rex@sembang-bola.invalid", // .invalid is a reserved domain: never deliverable
        passwordHash: await bcrypt.hash(randomBytes(48).toString("hex"), 12),
        role: AdminRole.EDITOR,
        isBot: true,
      },
      select: { id: true },
    });
    return created.id;
  })().catch((err) => {
    rexId = undefined; // retry next time
    throw err;
  });
  return rexId;
}
