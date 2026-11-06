import { test as setup } from "@playwright/test";
import {
  createTemporaryUser,
  roles,
  saveRoleUsers,
  sessionFile,
  signIn,
  type TestUser,
} from "./support/temporary-users";

// Un solo accesso per ruolo a ogni giro: le prove riusano queste sessioni salvate.
// Gli utenti restano fino al prossimo azzeramento del database locale.
setup("un accesso per ruolo, sessioni salvate", async ({ browser }) => {
  setup.setTimeout(120_000);
  const users: TestUser[] = [];
  for (const role of roles) {
    const user = await createTemporaryUser(role);
    const context = await browser.newContext();
    await signIn(await context.newPage(), user);
    await context.storageState({ path: sessionFile(role) });
    await context.close();
    users.push({ id: user.id, email: user.email, role: user.role });
  }
  saveRoleUsers(users);
});
