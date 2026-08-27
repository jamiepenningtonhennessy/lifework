import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { verifiedTestimonials } from "../../drizzle/schema";
import {
  TESTIMONIAL_ATTRIBUTION_LIMIT,
  TESTIMONIAL_QUOTE_LIMIT,
  TESTIMONIAL_SOURCE_REFERENCE_LIMIT,
  canApproveTestimonial,
} from "../../shared/verifiedTestimonials";
import { getApprovedVerifiedTestimonials, getDb } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const testimonialFields = z.object({
  quote: z.string().trim().min(12).max(TESTIMONIAL_QUOTE_LIMIT),
  attribution: z.string().trim().min(1).max(TESTIMONIAL_ATTRIBUTION_LIMIT),
  sourceReference: z.string().trim().min(1).max(TESTIMONIAL_SOURCE_REFERENCE_LIMIT),
  consentConfirmed: z.boolean(),
});

async function findTestimonial(id: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const [testimonial] = await db
    .select()
    .from(verifiedTestimonials)
    .where(eq(verifiedTestimonials.id, id))
    .limit(1);
  if (!testimonial) throw new TRPCError({ code: "NOT_FOUND", message: "Testimonial not found" });
  return { db, testimonial };
}

export const verifiedTestimonialsRouter = router({
  publicList: publicProcedure.query(async () => getApprovedVerifiedTestimonials()),

  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db.select().from(verifiedTestimonials).orderBy(desc(verifiedTestimonials.createdAt));
  }),

  create: adminProcedure.input(testimonialFields).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const result = await db.insert(verifiedTestimonials).values({
      ...input,
      status: "draft",
    });
    return { id: Number(result[0].insertId) };
  }),

  update: adminProcedure
    .input(testimonialFields.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { db, testimonial } = await findTestimonial(input.id);
      const requiresReapproval = testimonial.status === "approved";
      await db
        .update(verifiedTestimonials)
        .set({
          quote: input.quote,
          attribution: input.attribution,
          sourceReference: input.sourceReference,
          consentConfirmed: input.consentConfirmed,
          status: requiresReapproval ? "draft" : testimonial.status,
          approvedAt: requiresReapproval ? null : testimonial.approvedAt,
          approvedByUserId: requiresReapproval ? null : testimonial.approvedByUserId,
        })
        .where(eq(verifiedTestimonials.id, input.id));
      return { requiresReapproval };
    }),

  approve: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { db, testimonial } = await findTestimonial(input.id);
      if (!canApproveTestimonial(testimonial)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Record the feedback source and confirm permission before approving a testimonial.",
        });
      }
      await db
        .update(verifiedTestimonials)
        .set({
          status: "approved",
          approvedByUserId: ctx.user.id,
          approvedAt: new Date(),
          archivedAt: null,
        })
        .where(eq(verifiedTestimonials.id, input.id));
      return { success: true };
    }),

  archive: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { db } = await findTestimonial(input.id);
      await db
        .update(verifiedTestimonials)
        .set({ status: "archived", archivedAt: new Date() })
        .where(eq(verifiedTestimonials.id, input.id));
      return { success: true };
    }),

  remove: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { db } = await findTestimonial(input.id);
      await db.delete(verifiedTestimonials).where(eq(verifiedTestimonials.id, input.id));
      return { success: true };
    }),
});
