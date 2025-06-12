"use client";
import { Card, Stack, CardContent, TextField, Button, CardHeader } from "@mui/material";

type GenerateRecipeFormProps = {
    generateRecipe: () => void;
    setRecipeTitle: (title: string) => void;
    setRecipe: (title: string) => void;
    setPrompt: (title: string) => void;
    disabled: boolean;
    recipe: string;
    recipeTitle: string;
    prompt: string;
}

export const GenerateRecipeForm = ({
    generateRecipe,
    setRecipeTitle,
    setRecipe,
    setPrompt,
    recipe,
    recipeTitle,
    prompt,
    disabled = true
}: GenerateRecipeFormProps) => (
    <Card sx={{ width: 700 }}>
        <CardHeader title="Generacja nowego przepisu" />
        <CardContent>
            <Stack direction="column" gap={2}>
                <TextField label="Tytuł" value={recipeTitle} onChange={(e) => setRecipeTitle(e.target.value)}/>
                <TextField label="Przepis" value={recipe} multiline={true} rows={6} onChange={(e) => setRecipe(e.target.value)}/>
                <TextField label="Polecenie dla AI" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                <Button variant="contained" onClick={() => generateRecipe()} disabled={disabled}>Generuj</Button>
            </Stack>
        </CardContent>
    </Card>
);
