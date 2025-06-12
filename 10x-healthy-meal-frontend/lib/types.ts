export interface Recipe {
    id: string;
    title: string;
    modification_prompt: string;
    modified_text: string;
    original_text: string;
    created_at: string;
}

export interface Generation {
    generation_id: string;
    modification_prompt: string;
    original_text: string;
    modified_text: string;
}
