import { prisma } from "./prisma";

export async function logAudit(params: {
  userId?: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
}) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch {
    // non-blocking
  }
}
