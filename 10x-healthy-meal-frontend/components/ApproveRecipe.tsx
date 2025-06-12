import { Card, Stack, CardContent, Paper, Button, CardHeader } from "@mui/material";
import { useRouter } from "next/navigation";
import {Generation} from "@/lib/types";

type ApproveRecipeProps = {
    generation?: Generation;
    recipeTitle: string;
    deleteGeneration: () => void;
}

export const ApproveRecipe = ({ generation, recipeTitle, deleteGeneration }: ApproveRecipeProps) => {
    const router = useRouter();

    const saveRecipe = () => {
        void fetch("/api/recipes", {
            method: "POST",
            body: JSON.stringify({
                title: recipeTitle,
                ...generation
            })
        }).then(() => router.push("/profile"))
    }

    return (
        <Card sx={{ width: 700 }}>
            <CardHeader title="Wygenerowany przepis" />
            <CardContent>
                <Stack direction="column" gap={2}>
                    <Paper variant="outlined" sx={{ padding: 2 }}>{generation?.modified_text ?? "Brak nowego przepisu"}</Paper>
                    <Stack direction="row" gap={5} justifyContent="center">
                        <Button variant="contained" onClick={deleteGeneration}>Odrzuć</Button>
                        <Button variant="contained" onClick={saveRecipe}>Zapisz</Button>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    )
}
