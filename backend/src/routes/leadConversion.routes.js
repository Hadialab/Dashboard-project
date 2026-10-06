import express from "express";

import { repo } from "../db/repos/crm.js";
import { notesRepo } from "../db/repos/activity.js";
import { insertAuditEntry } from "../db/repos/audit.js";
import { transaction } from "../db/pool.js";
import { requireAuth } from "../auth/requireAuth.js";
import { can } from "../auth/permissions.js";
import { resources, validate } from "../validation/resources.js";
import { describeCreation, diffRecord } from "../audit/diff.js";
import { asyncHandler, badRequest, conflict, forbidden, notFound } from "../utils/asyncHandler.js";

const router = express.Router();

const leads = repo("leads");
const customers = repo("customers");

/**
 * Turns a qualified lead into a customer.
 *
 * One request, one transaction. Doing this as two calls from the browser — POST
 * /customers then PUT /leads/:id — leaves a real failure mode: the customer is
 * created, the lead update is rejected, and you are left with a duplicate
 * customer and a lead still claiming to be open. A half-converted lead is worse
 * than one that simply did not convert, so the whole thing either happens or
 * does not.
 *
 * The lead is never deleted. It stays visible with its status set to Converted
 * and a link to the customer it became, so the conversion history survives.
 *
 * Two permissions are required, because that is what the action actually does:
 * editing the lead, and creating a customer.
 */
router.post(
  "/:id/convert",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!can(req.user, "leads", "edit")) {
      throw forbidden("You do not have permission to convert leads");
    }

    if (!can(req.user, "customers", "create")) {
      throw forbidden("You do not have permission to create customers");
    }

    const lead = await leads.findById(req.organizationId, req.params.id);
    if (!lead) throw notFound("Lead not found");

    // Idempotency guard. Re-converting would create a second customer for the
    // same person, and the lead would end up pointing at whichever ran last.
    if (lead.convertedCustomerId) {
      throw conflict("This lead has already been converted", {
        customerId: lead.convertedCustomerId,
      });
    }

    const customerConfig = resources.customers;
    const { value, errors } = validate(customerConfig, req.body, { partial: false });
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    const result = await transaction(async (client) => {
      const created = await customers.insert(req.organizationId, value, client);

      // A plain update rather than a PUT, so this cannot be blocked by the
      // resource factory's ownership rules or wipe the lead's other fields.
      await client.query(
        `UPDATE leads
            SET status = $1, converted_customer_id = $2, updated_at = now()
          WHERE organization_id = $3 AND id = $4`,
        ["Converted", created.id, req.organizationId, lead.id],
      );

      // The timeline entry the resource factory would have written for a status
      // change, plus the link to what it became.
      await client.query(
        `INSERT INTO notes (id, organization_id, entity_type, entity_id, body, kind, author_id, author_name)
         VALUES (
           'n' || lpad(nextval('notes_id_seq')::text, 3, '0'),
           $1, 'lead', $2, $3, 'event', $4, $5
         )`,
        [
          req.organizationId,
          lead.id,
          // The customer's name rather than its id: this line is read by a person
          // in the timeline, and "Nadia C" means something where "c041" does not.
          `Status changed from ${lead.status} to Converted (became ${created.name})`,
          req.user.id,
          req.user.name,
        ],
      );

      return created;
    });

    // After the transaction commits, never inside it. The audit table has its own
    // write, and putting it in the transaction would mean an audit failure rolled
    // back a conversion the user had every right to — the same reason the
    // timeline entries above are part of the transaction but a failed log write
    // here would only log.
    //
    // Two entries, because two things changed: a customer appeared, and a lead
    // became Converted. An audit log with one row for that would be ambiguous
    // about which record the question "who did this to?" refers to.
    await insertAuditEntry(req.organizationId, {
      actorId: req.user.id,
      actorName: req.user.name,
      action: "create",
      entityType: "customer",
      entityId: result.id,
      entityLabel: result.name,
      changes: {
        ...describeCreation(result, resources.customers.fields),
        // Recorded because it is the fact that makes this entry traceable back to
        // the lead it came from, and nothing else on the customer records it.
        convertedFromLead: { from: null, to: lead.id },
      },
    });

    await insertAuditEntry(req.organizationId, {
      actorId: req.user.id,
      actorName: req.user.name,
      action: "convert",
      entityType: "lead",
      entityId: lead.id,
      entityLabel: lead.name,
      changes: {
        ...diffRecord(lead, { ...lead, status: "Converted", convertedCustomerId: result.id }),
        convertedCustomerId: { from: null, to: result.id },
      },
    });

    res.status(201).json({
      customer: result,
      leadId: lead.id,
      // Echoed so the client can update its lead list without a refetch.
      leadStatus: "Converted",
      convertedCustomerId: result.id,
    });
  }),
);

export default router;
