import { setupContext } from "./rbac/helpers";
import { organizationTests } from "./rbac/01_organization";
import { roleTests } from "./rbac/02_roles";
import { membershipTests } from "./rbac/03_membership";
import { permissionTests } from "./rbac/04_permissions";
import { refreshTests } from "./rbac/05_refresh";
import { securityTests } from "./rbac/06_security";
import { cpiIntegrationTests } from "./guarded_vault/01_cpi_integration";
import { cpiDeniedTests } from "./guarded_vault/02_cpi_denied";
import { cleanupTests } from "./rbac/07_cleanup";

describe("RBAC + Guarded Vault", function () {
  this.timeout(120_000);

  before(async function () {
    await setupContext();
  });

  // RBAC core program tests (in dependency order)
  organizationTests();
  roleTests();
  membershipTests();
  permissionTests();
  refreshTests();
  securityTests();

  // CPI consumer program tests
  cpiIntegrationTests();
  cpiDeniedTests();

  // Cleanup (must run last)
  cleanupTests();
});