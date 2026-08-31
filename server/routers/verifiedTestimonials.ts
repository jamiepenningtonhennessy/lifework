import { and, asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { testimonialPlacements, verifiedTestimonials } from "../../drizzle/schema";
import {
  TESTIMONIAL_ATTRIBUTION_LIMIT,
  TESTIMONIAL_QUOTE_LIMIT,
  TESTIMONIAL_SOURCE_REFERENCE_LIMIT,
  canApproveTestimonial,
  TESTIMONIAL_PAGE_KEYS,
} from "../../shared/verifiedTestimonials";
import { getApprovedVerifiedTestimonials, getApprovedVerifiedTestimonialsForPage, getDb } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const testimonialFields = z.object({
  quote: z.string().trim().min(12).max(TESTIMONIAL_QUOTE_LIMIT),
  attribution: z.string().trim().min(1).max(TESTIMONIAL_ATTRIBUTION_LIMIT),
  sourceReference: z.string().trim().min(1).max(TESTIMONIAL_SOURCE_REFERENCE_LIMIT),
  consentConfirmed: z.boolean(),
});

const publicDraftFields = testimonialFields.extend({
  website: z.string().max(0).optional(),
});

const placementPageInput = z.object({ pageKey: z.enum(TESTIMONIAL_PAGE_KEYS) });

const PUBLIC_DRAFT_WINDOW_MS = 60 * 60 * 1000;
const PUBLIC_DRAFT_LIMIT = 3;
const publicDraftAttempts = new Map<string, number[]>();

export function canSubmitPublicTestimonialDraft(requesterKey: string, now = Date.now()) {
  const recentAttempts = (publicDraftAttempts.get(requesterKey) ?? []).filter(
    (attemptedAt) => attemptedAt > now - PUBLIC_DRAFT_WINDOW_MS,
  );
  if (recentAttempts.length >= PUBLIC_DRAFT_LIMIT) {
    publicDraftAttempts.set(requesterKey, recentAttempts);
    return false;
  }
  recentAttempts.push(now);
  publicDraftAttempts.set(requesterKey, recentAttempts);
  return true;
}

export function resetPublicTestimonialDraftAttempts() {
  publicDraftAttempts.clear();
}

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
  publicForPage: publicProcedure
    .input(placementPageInput)
    .query(async ({ input }) => getApprovedVerifiedTestimonialsForPage(input.pageKey)),

  submitDraft: publicProcedure.input(publicDraftFields).mutation(async ({ ctx, input }) => {
    // Honeypot field: bots receive a neutral response without creating a record.
    if (input.website) return { success: true, submitted: false };
    if (!input.consentConfirmed) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Please confirm that public-display permission has been obtained before submitting a draft.",
      });
    }

    const forwardedFor = ctx.req.headers["x-forwarded-for"];
    const forwardedAddress = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const requesterKey = String(forwardedAddress ?? ctx.req.ip ?? "unknown").split(",")[0].trim();
    if (!canSubmitPublicTestimonialDraft(requesterKey || "unknown")) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Thank you. Please wait a little while before submitting another draft.",
      });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await db.insert(verifiedTestimonials).values({
      quote: input.quote,
      attribution: input.attribution,
      sourceReference: input.sourceReference,
      consentConfirmed: true,
      status: "draft",
    });
    return { success: true, submitted: true };
  }),

  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db.select().from(verifiedTestimonials).orderBy(desc(verifiedTestimonials.createdAt));
  }),

  placements: adminProcedure
    .input(placementPageInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db
        .select({
          id: testimonialPlacements.id,
          testimonialId: testimonialPlacements.testimonialId,
          pageKey: testimonialPlacements.pageKey,
          sortOrder: testimonialPlacements.sortOrder,
          quote: verifiedTestimonials.quote,
          attribution: verifiedTestimonials.attribution,
        })
        .from(testimonialPlacements)
        .innerJoin(verifiedTestimonials, eq(testimonialPlacements.testimonialId, verifiedTestimonials.id))
        .where(eq(testimonialPlacements.pageKey, input.pageKey))
        .orderBy(asc(testimonialPlacements.sortOrder), asc(testimonialPlacements.id));
    }),

  setPlacement: adminProcedure
    .input(placementPageInput.extend({ testimonialId: z.number().int().positive(), assigned: z.boolean() }))
    .mutation(async ({ input }) => {
      const { db, testimonial } = await findTestimonial(input.testimonialId);
      if (input.assigned) {
        if (testimonial.status !== "approved" || !testimonial.consentConfirmed) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved testimonials with recorded permission can be placed on a public page." });
        }
        const [existing] = await db
          .select({ id: testimonialPlacements.id })
          .from(testimonialPlacements)
          .where(and(eq(testimonialPlacements.testimonialId, input.testimonialId), eq(testimonialPlacements.pageKey, input.pageKey)))
          .limit(1);
        if (!existing) {
          const existingPlacements = await db
            .select({ sortOrder: testimonialPlacements.sortOrder })
            .from(testimonialPlacements)
            .where(eq(testimonialPlacements.pageKey, input.pageKey));
          const nextOrder = Math.max(-1, ...existingPlacements.map((placement) => placement.sortOrder)) + 1;
          await db.insert(testimonialPlacements).values({ testimonialId: input.testimonialId, pageKey: input.pageKey, sortOrder: nextOrder });
        }
      } else {
        await db
          .delete(testimonialPlacements)
          .where(and(eq(testimonialPlacements.testimonialId, input.testimonialId), eq(testimonialPlacements.pageKey, input.pageKey)));
      }
      return { success: true };
    }),

  reorderPlacement: adminProcedure
    .input(placementPageInput.extend({ placementId: z.number().int().positive(), direction: z.enum(["up", "down"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const placements = await db
        .select({ id: testimonialPlacements.id, sortOrder: testimonialPlacements.sortOrder })
        .from(testimonialPlacements)
        .where(eq(testimonialPlacements.pageKey, input.pageKey))
        .orderBy(asc(testimonialPlacements.sortOrder), asc(testimonialPlacements.id));
      const index = placements.findIndex((placement) => placement.id === input.placementId);
      if (index < 0) throw new TRPCError({ code: "NOT_FOUND", message: "Placement not found for this page." });
      const adjacent = placements[input.direction === "up" ? index - 1 : index + 1];
      if (!adjacent) return { success: true, moved: false };
      const current = placements[index];
      await db.update(testimonialPlacements).set({ sortOrder: adjacent.sortOrder }).where(eq(testimonialPlacements.id, current.id));
      await db.update(testimonialPlacements).set({ sortOrder: current.sortOrder }).where(eq(testimonialPlacements.id, adjacent.id));
      return { success: true, moved: true };
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
