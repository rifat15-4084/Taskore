import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function ok<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function fail(message: string, status = 400, errors?: unknown) {
  return NextResponse.json({ success: false, message, ...(errors ? { errors } : {}) }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return fail(message, 401);
}

export function forbidden(message = "You do not have permission to do that") {
  return fail(message, 403);
}

export function notFound(message = "Not found") {
  return fail(message, 404);
}

export function serverError(message = "Something went wrong") {
  return fail(message, 500);
}

export function zodErrors(error: ZodError) {
  return error.flatten().fieldErrors;
}
