"use client";

import { useState } from "react";
import { GenerateRecipeForm } from "@/components/GenerateRecipeForm";
import { Stack } from "@mui/material";
import { theme } from "@/components/theme";
import { ThemeProvider } from "@mui/material/styles";
import { ApproveRecipe } from "@/components/ApproveRecipe";
import { Generation } from "@/lib/types";

export default function ProtectedPage() {
    const [recipeTitle, setRecipeTitle] = useState("");
    const [recipe, setRecipe] = useState("");
    const [prompt, setPrompt] = useState("");
    const [generation, setGeneration] = useState<Generation | null>(null);

    const generateRecipe = () => {
        fetch("/api/recipes/generate", {
            method: "POST",
            body: JSON.stringify({
                original_text: recipe,
                modification_prompt: prompt
            }),
        }).then(res => res.json()).then(resultGeneration => setGeneration(resultGeneration));
    }

    const deleteGeneration = () => {
        if (generation) {
            void fetch(`/api/recipes/generate/${generation?.generation_id}`, {
                method: "DELETE",
            }).then(() => {
                setGeneration(null);

            });
        }
    }

    return (
        <ThemeProvider theme={theme}>
            <Stack direction="column" alignItems="center" gap={2} width="100%" py={5}>
                <GenerateRecipeForm
                    generateRecipe={generateRecipe}
                    setRecipeTitle={setRecipeTitle}
                    setRecipe={setRecipe}
                    setPrompt={setPrompt}
                    recipeTitle={recipeTitle}
                    recipe={recipe}
                    prompt={prompt}
                    disabled={!recipeTitle || !recipe || !prompt}
                />
                {generation && <ApproveRecipe generation={generation} recipeTitle={recipeTitle} deleteGeneration={deleteGeneration} />}
            </Stack>
        </ThemeProvider>
    )
}
