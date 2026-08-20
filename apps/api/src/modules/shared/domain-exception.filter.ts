import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Response } from "express";
import { envelopeFail } from "@misupertostada/shared";
import { DomainException } from "./domain.exception";

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof DomainException) {
      res
        .status(exception.httpStatus)
        .json(envelopeFail(exception.code, exception.message));
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === "string"
          ? body
          : typeof body === "object" &&
              body !== null &&
              "message" in body &&
              typeof body.message === "string"
            ? body.message
            : exception.message;
      res.status(status).json(envelopeFail("HTTP", message));
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.message : "Error interno",
    );
    res.status(500).json(envelopeFail("INTERNAL", "Error interno"));
  }
}
