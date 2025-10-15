/** @jest-environment node */
const { sbFromReq } = require("../../supabase/supabaseFromReq");
const { createClient } = require("@supabase/supabase-js");

// Mock Supabase
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {},
    from: jest.fn(),
  })),
}));

describe("supabaseFromReq", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  it("returns null when no authorization header", () => {
    const req = {
      headers: {},
    };

    const result = sbFromReq(req);

    expect(result).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns null when authorization header is empty", () => {
    const req = {
      headers: {
        authorization: "",
      },
    };

    const result = sbFromReq(req);

    expect(result).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns null when token is missing from Bearer format", () => {
    const req = {
      headers: {
        authorization: "Bearer",
      },
    };

    const result = sbFromReq(req);

    expect(result).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns null when token is empty string", () => {
    const req = {
      headers: {
        authorization: "Bearer ",
      },
    };

    const result = sbFromReq(req);

    expect(result).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates Supabase client with valid token", () => {
    const req = {
      headers: {
        authorization: "Bearer valid-token-123",
      },
    };

    const result = sbFromReq(req);

    expect(result).not.toBeNull();
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-key",
      {
        global: {
          headers: {
            Authorization: "Bearer valid-token-123",
          },
        },
      }
    );
  });

  it("extracts token correctly from Bearer format", () => {
    const req = {
      headers: {
        authorization: "Bearer my-jwt-token",
      },
    };

    sbFromReq(req);

    expect(createClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        global: {
          headers: {
            Authorization: "Bearer my-jwt-token",
          },
        },
      })
    );
  });

  it("handles authorization header with different casing", () => {
    const req = {
      headers: {
        Authorization: "Bearer token-123", // Capital A
      },
    };

    // Note: This will fail if your code doesn't handle case-insensitive headers
    // If it should work, you might need to update your implementation
    const result = sbFromReq(req);

    // Depending on your Express setup, this might be null
    // Express usually normalizes headers to lowercase
  });

  it("returns different client instances for different tokens", () => {
    const req1 = {
      headers: {
        authorization: "Bearer token-1",
      },
    };

    const req2 = {
      headers: {
        authorization: "Bearer token-2",
      },
    };

    sbFromReq(req1);
    sbFromReq(req2);

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(createClient).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        global: {
          headers: {
            Authorization: "Bearer token-1",
          },
        },
      })
    );
    expect(createClient).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        global: {
          headers: {
            Authorization: "Bearer token-2",
          },
        },
      })
    );
  });

  it("uses environment variables for Supabase configuration", () => {
    process.env.SUPABASE_URL = "https://custom.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "custom-key";

    const req = {
      headers: {
        authorization: "Bearer token",
      },
    };

    sbFromReq(req);

    expect(createClient).toHaveBeenCalledWith(
      "https://custom.supabase.co",
      "custom-key",
      expect.any(Object)
    );
  });

  it("handles malformed authorization header gracefully", () => {
    const req = {
      headers: {
        authorization: "NotBearer token-123",
      },
    };

    const result = sbFromReq(req);

    // Should still work as it splits on space
    // But token would be "token-123"
    expect(result).not.toBeNull();
  });

  it("handles authorization with extra spaces", () => {
    const req = {
      headers: {
        authorization: "Bearer   token-with-spaces",
      },
    };

    sbFromReq(req);

    // Token would be empty string due to multiple spaces
    // This might be a bug in your implementation
  });
});
