import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { loadEnv } from "../../config/env";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { PermisosGuard } from "./permisos.guard";
import { SessionGuard } from "./session.guard";
import { SessionService } from "./session.service";
import { UsuariosController } from "./usuarios.controller";
import { UsuariosService } from "./usuarios.service";
import { SESSION_COOKIE_CONFIG } from "./actor";

@Module({
  controllers: [AuthController, UsuariosController],
  providers: [
    PasswordService,
    SessionService,
    AuthService,
    UsuariosService,
    {
      provide: SESSION_COOKIE_CONFIG,
      useFactory: () => {
        const env = loadEnv();
        return {
          name: env.SESSION_COOKIE_NAME,
          ttlSeconds: env.SESSION_TTL_SECONDS,
          secure: env.NODE_ENV === "production",
        };
      },
    },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: PermisosGuard },
  ],
  exports: [SessionService, PasswordService],
})
export class IdentityModule {}
