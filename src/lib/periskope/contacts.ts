import { PeriskopeApiError, type PeriskopeFetch } from "./client";
import type {
  PeriskopeContact,
  ContactListResponse,
  CreateContactRequest,
  UpdateContactRequest,
  UpdateContactLabelsRequest,
  PaginationOptions,
} from "./types";

async function assertOk(response: Response, action: string): Promise<void> {
  if (!response.ok) {
    let msg = response.statusText || "Unknown API error";
    let reason: string | undefined;
    try {
      const body = await response.json();
      msg = body?.message || msg;
      reason = body?.code;
    } catch {
      // body not JSON
    }
    throw new PeriskopeApiError(
      `Failed to ${action} (${response.status}): ${msg}`,
      response.status,
      reason
    );
  }
}

export async function listContacts(options: PaginationOptions = {}, fetch: PeriskopeFetch): Promise<ContactListResponse> {
  const params = new URLSearchParams();
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  const response = await fetch(`/contacts?${params.toString()}`);
  await assertOk(response, "list contacts");
  return response.json();
}

export async function getContact(contactId: string, fetch: PeriskopeFetch): Promise<PeriskopeContact> {
  const response = await fetch(`/contacts/${contactId}`);
  await assertOk(response, "get contact");
  return response.json();
}

export async function createContact(request: CreateContactRequest, fetch: PeriskopeFetch): Promise<PeriskopeContact> {
  const response = await fetch("/contacts/create", {
    method: "POST",
    body: JSON.stringify(request),
  });
  await assertOk(response, "create contact");
  return response.json();
}

export async function updateContact(
  contactId: string,
  request: UpdateContactRequest,
  fetch: PeriskopeFetch
): Promise<PeriskopeContact> {
  const response = await fetch(`/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
  await assertOk(response, "update contact");
  return response.json();
}

export async function updateContactLabels(request: UpdateContactLabelsRequest, fetch: PeriskopeFetch): Promise<void> {
  const response = await fetch("/contacts/labels", {
    method: "PATCH",
    body: JSON.stringify(request),
  });
  await assertOk(response, "update contact labels");
}
