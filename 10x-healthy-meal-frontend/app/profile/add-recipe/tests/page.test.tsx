import Page from "../page";
import { describe, test, vi, expect } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn()
    })
}))

describe("Add recipe", () => {
    test("add new recipe", async () => {
        const mockResponse = {
            generation_id: "gen-id",
            modification_prompt: "prompt",
            original_text: "original text",
            modified_text: "modified text"
        };

        // @ts-ignore
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve(mockResponse),
            }),
        );

        const { debug, getByLabelText, getByText, queryByText } = render(<Page />);

        fireEvent.change(getByLabelText("Tytuł"), { target: { value: "Tytuł testowy"}})
        fireEvent.change(getByLabelText("Przepis"), { target: { value: "Przepis testowy"}})
        fireEvent.change(getByLabelText("Polecenie dla AI"), { target: { value: "prompt"}})

        fireEvent.click(getByText("Generuj"));

        await waitFor(() => {
            fireEvent.click(getByText("Zapisz"))
        })

        expect(global.fetch).toHaveBeenCalledWith("/api/recipes",
            {
                 "body": "{\"title\":\"Tytuł testowy\",\"generation_id\":\"gen-id\",\"modification_prompt\":\"prompt\",\"original_text\":\"original text\",\"modified_text\":\"modified text\"}",
                 "method": "POST",
            },
        );
    });
});
