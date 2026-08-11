import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  currentUserMock,
  findUniqueMock,
  findFirstMock,
  createMock,
  updateMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  currentUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findFirstMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
      findFirst: findFirstMock,
      create: createMock,
      update: updateMock,
    },
  },
}));

const {
  AppUserProvisioningError,
  getCurrentAdminUser,
  getCurrentAppUser,
  syncClerkUserFromWebhook,
} = await import("./app-user");

const APP_USER = {
  id: "cuid_local_user_1",
  email: "learner@example.com",
  name: "Learner",
  locale: "en",
  isAdmin: false,
  isBlocked: false,
};

function clerkUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_clerk_1",
    externalId: null,
    primaryEmailAddress: {
      emailAddress: "learner@example.com",
      verification: { status: "verified" },
    },
    firstName: "Learner",
    lastName: "Example",
    fullName: "Learner Example",
    ...overrides,
  };
}

function webhookUser(overrides: Record<string, unknown> = {}) {
  return {
    object: "user",
    id: "user_clerk_1",
    external_id: null,
    primary_email_address_id: "email_1",
    email_addresses: [
      {
        id: "email_1",
        email_address: "learner@example.com",
        verification: { status: "verified" },
      },
    ],
    first_name: "Learner",
    last_name: "Example",
    ...overrides,
  } as never;
}

beforeEach(() => {
  authMock.mockReset();
  currentUserMock.mockReset();
  findUniqueMock.mockReset();
  findFirstMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();

  authMock.mockResolvedValue({ userId: "user_clerk_1" });
  findUniqueMock.mockResolvedValue(null);
  findFirstMock.mockResolvedValue(null);
  currentUserMock.mockResolvedValue(clerkUser());
  createMock.mockResolvedValue(APP_USER);
  updateMock.mockResolvedValue(APP_USER);
});

describe("getCurrentAppUser", () => {
  it("returns null for an anonymous Clerk request", async () => {
    authMock.mockResolvedValue({ userId: null });

    await expect(getCurrentAppUser()).resolves.toBeNull();
    expect(currentUserMock).not.toHaveBeenCalled();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("uses the existing Clerk-to-CUID mapping without treating the Clerk subject as a foreign key", async () => {
    findUniqueMock.mockResolvedValue(APP_USER);

    await expect(getCurrentAppUser()).resolves.toEqual(APP_USER);
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clerkUserId: "user_clerk_1" } }),
    );
    expect(currentUserMock).not.toHaveBeenCalled();
  });

  it("treats a blocked mapped account as unauthenticated", async () => {
    findUniqueMock.mockResolvedValue({ ...APP_USER, isBlocked: true });

    await expect(getCurrentAppUser()).resolves.toBeNull();
    expect(currentUserMock).not.toHaveBeenCalled();
  });

  it("records a presence heartbeat for a mapped account with no prior activity", async () => {
    findUniqueMock.mockResolvedValue({ ...APP_USER, lastActiveAt: null });

    await getCurrentAppUser();

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: APP_USER.id },
      data: { lastActiveAt: expect.any(Date) },
    });
  });

  it("throttles the presence heartbeat instead of writing on every request", async () => {
    findUniqueMock.mockResolvedValue({ ...APP_USER, lastActiveAt: new Date() });

    await getCurrentAppUser();

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("records a fresh presence heartbeat once the throttle window has elapsed", async () => {
    const staleActivity = new Date(Date.now() - 5 * 60 * 1000);
    findUniqueMock.mockResolvedValue({ ...APP_USER, lastActiveAt: staleActivity });

    await getCurrentAppUser();

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: APP_USER.id },
      data: { lastActiveAt: expect.any(Date) },
    });
  });

  it("does not record a presence heartbeat for a blocked account", async () => {
    findUniqueMock.mockResolvedValue({ ...APP_USER, isBlocked: true, lastActiveAt: null });

    await getCurrentAppUser();

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("does not let a failed presence heartbeat fail the real request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    findUniqueMock.mockResolvedValue({ ...APP_USER, lastActiveAt: null });
    updateMock.mockRejectedValue(new Error("connection lost"));

    await expect(getCurrentAppUser()).resolves.toEqual({ ...APP_USER, lastActiveAt: null });
  });

  it("admits only the owner account through the admin guard", async () => {
    findUniqueMock.mockResolvedValue({ ...APP_USER, isAdmin: true });

    await expect(getCurrentAdminUser()).resolves.toEqual({ ...APP_USER, isAdmin: true });
  });

  it("does not disclose the admin guard to a regular account", async () => {
    findUniqueMock.mockResolvedValue(APP_USER);

    await expect(getCurrentAdminUser()).resolves.toBeNull();
  });

  it("links an imported legacy account only through Clerk externalId", async () => {
    currentUserMock.mockResolvedValue(clerkUser({ externalId: APP_USER.id }));
    findUniqueMock.mockImplementation(async ({ where }: { where: Record<string, string> }) => {
      if ("clerkUserId" in where) return null;
      if (where.id === APP_USER.id) return { id: APP_USER.id, clerkUserId: null };
      return null;
    });
    updateMock
      .mockResolvedValueOnce(APP_USER)
      .mockResolvedValueOnce({ ...APP_USER, name: "Learner Example" });

    await expect(getCurrentAppUser()).resolves.toEqual({ ...APP_USER, name: "Learner Example" });
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: APP_USER.id },
        data: { clerkUserId: "user_clerk_1" },
      }),
    );
  });

  it("creates a new local account only from a verified Clerk email", async () => {
    await expect(getCurrentAppUser()).resolves.toEqual(APP_USER);

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: { equals: "learner@example.com", mode: "insensitive" } },
      }),
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clerkUserId: "user_clerk_1",
          email: "learner@example.com",
        }),
      }),
    );
  });

  it("never claims a legacy account by matching its email", async () => {
    findFirstMock.mockResolvedValue({ id: APP_USER.id });

    await expect(getCurrentAppUser()).rejects.toBeInstanceOf(AppUserProvisioningError);
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("fails closed when Clerk has not verified the primary email", async () => {
    currentUserMock.mockResolvedValue(
      clerkUser({
        primaryEmailAddress: {
          emailAddress: "learner@example.com",
          verification: { status: "unverified" },
        },
      }),
    );

    await expect(getCurrentAppUser()).rejects.toBeInstanceOf(AppUserProvisioningError);
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("syncClerkUserFromWebhook", () => {
  it("uses the same externalId-only import mapping for a verified webhook user", async () => {
    findUniqueMock.mockImplementation(async ({ where }: { where: Record<string, string> }) => {
      if ("clerkUserId" in where) return null;
      if (where.id === APP_USER.id) return { id: APP_USER.id, clerkUserId: null };
      return null;
    });
    updateMock
      .mockResolvedValueOnce(APP_USER)
      .mockResolvedValueOnce({ ...APP_USER, name: "Learner Example" });

    await expect(
      syncClerkUserFromWebhook(webhookUser({ external_id: APP_USER.id })),
    ).resolves.toEqual({ ...APP_USER, name: "Learner Example" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("provisions a new local account from a verified webhook primary email", async () => {
    await expect(syncClerkUserFromWebhook(webhookUser())).resolves.toEqual(APP_USER);

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: { equals: "learner@example.com", mode: "insensitive" } },
      }),
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clerkUserId: "user_clerk_1",
          email: "learner@example.com",
          name: "Learner Example",
        }),
      }),
    );
  });

  it("never claims a legacy account by email from a verified webhook payload", async () => {
    findFirstMock.mockResolvedValue({ id: APP_USER.id });

    await expect(syncClerkUserFromWebhook(webhookUser())).rejects.toBeInstanceOf(
      AppUserProvisioningError,
    );

    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("acknowledges an unverified webhook user without creating a local account", async () => {
    await expect(
      syncClerkUserFromWebhook(
        webhookUser({
          email_addresses: [
            {
              id: "email_1",
              email_address: "learner@example.com",
              verification: { status: "unverified" },
            },
          ],
        }),
      ),
    ).resolves.toBeNull();

    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
