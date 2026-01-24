import {
    fetchPortfolio,
    createPortfolioItem,
    deletePortfolioItem,
    fetchAvailability,
    createAvailability,
    deleteAvailability
} from "../data-service";
import apiClient from "../api-service";

// Mock apiClient
jest.mock("../api-service", () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
}));

describe("data-service - Profile and Portfolio", () => {
    const userId = "test-user-id";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Portfolio", () => {
        it("should fetch portfolio items", async () => {
            const mockItems = [
                { id: "1", title: "Project 1", mediaUrl: "url1", mediaType: "image" },
                { id: "2", title: "Project 2", mediaUrl: "url2", mediaType: "video" },
            ];
            (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: mockItems } });

            const result = await fetchPortfolio(userId);

            expect(apiClient.get).toHaveBeenCalledWith(`/portfolio?professionalId=${userId}`);
            expect(result).toEqual(mockItems);
        });

        it("should return empty array when fetch portfolio fails", async () => {
            (apiClient.get as jest.Mock).mockRejectedValue(new Error("API Error"));

            const result = await fetchPortfolio(userId);

            expect(result).toEqual([]);
        });

        it("should create a portfolio item", async () => {
            const newItem = { title: "New", mediaUrl: "url", mediaType: "image", professionalId: userId };
            (apiClient.post as jest.Mock).mockResolvedValue({ data: { id: "new-id", ...newItem } });

            const result = await createPortfolioItem(newItem as any);

            expect(apiClient.post).toHaveBeenCalledWith("/portfolio", newItem);
            expect(result.id).toBe("new-id");
        });

        it("should delete a portfolio item", async () => {
            (apiClient.delete as jest.Mock).mockResolvedValue({ data: {} });

            await deletePortfolioItem("item-id");

            expect(apiClient.delete).toHaveBeenCalledWith("/portfolio/item-id");
        });
    });

    describe("Availability", () => {
        it("should fetch availability slots", async () => {
            const mockSlots = [
                { id: "1", date: "2024-01-01", startTime: "09:00", endTime: "18:00" },
            ];
            (apiClient.get as jest.Mock).mockResolvedValue({ data: mockSlots });

            const result = await fetchAvailability(userId);

            expect(apiClient.get).toHaveBeenCalledWith(`/availability?professionalId=${userId}`);
            expect(result).toEqual(mockSlots);
        });

        it("should create availability", async () => {
            const data = { dates: ["2024-01-01"], startTime: "09:00", endTime: "12:00", professionalId: userId };
            (apiClient.post as jest.Mock).mockResolvedValue({ data: { id: "new-slot-id" } });

            const result = await createAvailability(data as any);

            expect(apiClient.post).toHaveBeenCalledWith("/availability", { ...data, type: "available" });
            expect((result as any).id).toBe("new-slot-id");
        });

        it("should delete availability", async () => {
            (apiClient.delete as jest.Mock).mockResolvedValue({ data: {} });

            await deleteAvailability("slot-id");

            expect(apiClient.delete).toHaveBeenCalledWith("/availability/slot-id");
        });
    });
});
