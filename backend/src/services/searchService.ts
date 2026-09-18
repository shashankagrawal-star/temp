import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env";

export const EMAILS_INDEX = "emails";

export const esClient = new Client({ node: env.elasticsearchUrl });

export async function ensureEmailsIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: EMAILS_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: EMAILS_INDEX,
        mappings: {
          properties: {
            userId: { type: "keyword" },
            senderId: { type: "keyword" },
            recipientEmail: { type: "keyword" },
            subject: { type: "text" },
            body: { type: "text" },
            status: { type: "keyword" },
            scheduledAt: { type: "date" },
            sentAt: { type: "date" },
          },
        },
      });
    }
  } catch (err) {
    console.error("Elasticsearch index setup failed (search will be degraded):", err);
  }
}

export interface EmailSearchDoc {
  id: string;
  userId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
}

export async function indexEmailDoc(doc: EmailSearchDoc): Promise<void> {
  try {
    await esClient.index({
      index: EMAILS_INDEX,
      id: doc.id,
      document: doc,
      refresh: "wait_for",
    });
  } catch (err) {
    console.error("Failed to index email doc in Elasticsearch:", err);
  }
}

/**
 * Bulk variant — one HTTP round trip for the whole batch instead of one per
 * doc, so indexing 1000+ newly-scheduled emails doesn't serialize into 1000
 * sequential ES calls (and doesn't force a segment refresh per doc).
 */
export async function indexEmailDocsBulk(docs: EmailSearchDoc[]): Promise<void> {
  if (docs.length === 0) return;
  try {
    await esClient.bulk({
      refresh: false,
      operations: docs.flatMap((doc) => [
        { index: { _index: EMAILS_INDEX, _id: doc.id } },
        doc,
      ]),
    });
  } catch (err) {
    console.error("Failed to bulk index email docs in Elasticsearch:", err);
  }
}

export async function searchEmails(userId: string, query: string) {
  try {
    const result = await esClient.search<EmailSearchDoc>({
      index: EMAILS_INDEX,
      query: {
        bool: {
          filter: [{ term: { userId } }],
          must: query
            ? [
                {
                  multi_match: {
                    query,
                    fields: ["subject", "body", "recipientEmail"],
                  },
                },
              ]
            : [{ match_all: {} }],
        },
      },
      size: 50,
      sort: [{ scheduledAt: { order: "desc" } }],
    });
    return result.hits.hits.map((hit) => hit._source);
  } catch (err) {
    console.error("Elasticsearch search failed:", err);
    return [];
  }
}
