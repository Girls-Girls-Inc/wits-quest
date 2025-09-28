// tests/roleWatcher.test.js
import { initRoleWatcher } from "../roleWatcher";

// Mock supabase
const mockOnAuthStateChange = jest.fn();
const mockGetSession = jest.fn();
jest.mock("../supabase/supabaseClient", () => ({
    __esModule: true,
    default: {
        auth: {
            getSession: () => mockGetSession(),
            onAuthStateChange: (cb) => {
                mockOnAuthStateChange(cb);
                return { data: { subscription: { unsubscribe: jest.fn() } } };
            },
        },
    },
}));

// Mock fetch
global.fetch = jest.fn();

// Helper to capture role changes
function listenRoleChanges() {
    const events = [];
    window.addEventListener("role:change", (e) => {
        events.push(e.detail);
    });
    return events;
}

describe("roleWatcher", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete window.__IS_MODERATOR__;
    });

    it("should set default role to false on init", async () => {
        mockGetSession.mockResolvedValueOnce({ data: { session: null } });

        const events = listenRoleChanges();
        await initRoleWatcher();

        expect(window.__IS_MODERATOR__).toBe(false);
        expect(events[0]).toEqual(expect.objectContaining({ isModerator: false, reason: "init" }));
    });

    it("should set role based on API response when session exists", async () => {
        const fakeUserId = "user-123";
        const fakeToken = "token-abc";
        mockGetSession.mockResolvedValueOnce({
            data: { session: { user: { id: fakeUserId }, access_token: fakeToken } },
        });

        // Mock fetch to return moderator=true
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ is_moderator: true }),
        });

        const events = listenRoleChanges();
        await initRoleWatcher();

        // First event: init=false, Second event: from fetchIsModerator
        expect(events[0].isModerator).toBe(false);
        expect(events[1]).toEqual(
            expect.objectContaining({ isModerator: true, reason: "initial", userId: fakeUserId })
        );
        expect(window.__IS_MODERATOR__).toBe(true);
    });

    it("should handle auth SIGNED_OUT event", async () => {
        mockGetSession.mockResolvedValueOnce({ data: { session: null } });

        let cb;
        mockOnAuthStateChange.mockImplementationOnce((callback) => {
            cb = callback;
            return { data: { subscription: { unsubscribe: jest.fn() } } };
        });

        const events = listenRoleChanges();
        await initRoleWatcher();

        // simulate SIGNED_OUT
        await cb("SIGNED_OUT", null);

        expect(window.__IS_MODERATOR__).toBe(false);
        expect(events[1]).toEqual(expect.objectContaining({ reason: "signed_out", isModerator: false }));
    });

    it("should handle SIGNED_IN event with moderator=false", async () => {
        mockGetSession.mockResolvedValueOnce({ data: { session: null } });

        let cb;
        mockOnAuthStateChange.mockImplementationOnce((callback) => {
            cb = callback;
            return { data: { subscription: { unsubscribe: jest.fn() } } };
        });

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ is_moderator: false }),
        });

        const events = listenRoleChanges();
        await initRoleWatcher();

        const fakeSession = { user: { id: "u-1" }, access_token: "t-1" };
        await cb("SIGNED_IN", fakeSession);

        expect(window.__IS_MODERATOR__).toBe(false);
        expect(events[1]).toEqual(expect.objectContaining({ reason: "signed_in", isModerator: false }));
    });
});
